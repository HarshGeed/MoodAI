// TMDB API service for fetching movies based on mood (v4 Bearer Auth)
import { upsertVector } from "./pinecone";

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
}

interface TMDBDiscoverResponse {
  results: Array<{
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    release_date: string;
    vote_average: number;
    genre_ids: number[];
  }>;
}

/**
 * Maps mood labels to TMDB genre IDs
 * Genre IDs:
 * 28=Action, 35=Comedy, 18=Drama, 53=Thriller,
 * 10749=Romance, 99=Documentary, 16=Animation
 */
function getMoodMovieParams(moodLabel: string): {
  genreIds?: number[];
  sortBy?: string;
} {
  const mood = moodLabel.toLowerCase();

  const map: Record<string, { genreIds?: number[]; sortBy?: string }> = {
    happy: {
      genreIds: [35, 16],
      sortBy: "popularity.desc",
    },
    sad: {
      genreIds: [18, 10749],
      sortBy: "popularity.desc",
    },
    angry: {
      genreIds: [28, 53],
      sortBy: "popularity.desc",
    },
    stressed: {
      genreIds: [35, 99],
      sortBy: "popularity.desc",
    },
    calm: {
      genreIds: [99, 18],
      sortBy: "popularity.desc",
    },
    neutral: {
      sortBy: "popularity.desc",
    },
  };

  return map[mood] || map.neutral;
}

/**
 * Fetch movies from TMDB based on mood
 */
export async function getMoviesByMood(
  moodLabel: string,
  maxResults: number = 20
): Promise<TMDBMovie[]> {
  const token = process.env.TMDB_ACCESS_TOKEN;

  if (!token) {
    throw new Error("TMDB_ACCESS_TOKEN is not set in environment variables");
  }

  const params = getMoodMovieParams(moodLabel);
  const url = new URL("https://api.themoviedb.org/3/discover/movie");

  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");
  url.searchParams.set("sort_by", params.sortBy || "popularity.desc");

  if (params.genreIds?.length) {
    url.searchParams.set("with_genres", params.genreIds.join(","));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `TMDB API error: ${response.status} ${errorText}`
    );
  }

  const data: TMDBDiscoverResponse = await response.json();

  return data.results.slice(0, maxResults).map((movie) => ({
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    posterPath: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null,
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
    genreIds: movie.genre_ids,
  }));
}

/**
 * Store movie metadata as embeddings in Pinecone
 * Uses descriptive text (title + overview + genres), not IDs
 */
export async function storeMovieEmbedding(movie: TMDBMovie): Promise<void> {
  // Genre ID to name mapping
  const genreNames: Record<number, string> = {
    28: "Action", 35: "Comedy", 18: "Drama", 53: "Thriller",
    10749: "Romance", 99: "Documentary", 16: "Animation",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10751: "Family",
  };

  // Create descriptive text for embedding (NOT ID-based)
  const genreLabels = movie.genreIds
    .map((id) => genreNames[id] || `Genre${id}`)
    .join(", ");
  
  const textContent = `${movie.title}. ${movie.overview}. Genres: ${genreLabels}. Released: ${movie.releaseDate}`;
  
  const vectorId = `tmdb-movie-${movie.id}`;
  
  try {
    await upsertVector(
      vectorId,
      textContent,
      {
        source: "tmdb",
        type: "movie",
        movieId: movie.id,
        title: movie.title,
        releaseDate: movie.releaseDate,
        voteAverage: movie.voteAverage,
        posterPath: movie.posterPath,
        genreIds: movie.genreIds,
        genres: genreLabels,
      }
    );
  } catch (error) {
    // Log but don't fail - graceful degradation
    console.warn(`⚠ Failed to store movie embedding for ${movie.id}:`, error);
  }
}
