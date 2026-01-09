// TMDB API service for fetching movies based on mood

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
 * Maps mood categories to TMDB genre IDs and keywords
 * Genre IDs: 28=Action, 35=Comedy, 18=Drama, 27=Horror, 10749=Romance, 99=Documentary, 16=Animation
 */
function getMoodMovieParams(moodLabel: string, moodCategory: string): {
  genreIds?: number[];
  keywords?: string;
  sortBy?: string;
} {
  const moodLower = moodLabel.toLowerCase();

  const params: Record<string, { genreIds?: number[]; keywords?: string; sortBy?: string }> = {
    happy: {
      genreIds: [35, 16], // Comedy, Animation
      keywords: "uplifting, feel-good, comedy",
      sortBy: "popularity.desc",
    },
    sad: {
      genreIds: [18, 10749], // Drama, Romance
      keywords: "emotional, drama, heartwarming",
      sortBy: "popularity.desc",
    },
    angry: {
      genreIds: [28, 53], // Action, Thriller
      keywords: "action, intense, adrenaline",
      sortBy: "popularity.desc",
    },
    stressed: {
      genreIds: [35, 99], // Comedy, Documentary
      keywords: "light-hearted, relaxing, calm",
      sortBy: "popularity.desc",
    },
    calm: {
      genreIds: [99, 18], // Documentary, Drama
      keywords: "peaceful, nature, mindfulness",
      sortBy: "popularity.desc",
    },
    neutral: {
      sortBy: "popularity.desc", // Just get popular movies
    },
  };

  return params[moodLower] || params.neutral;
}

/**
 * Discover movies from TMDB based on mood
 */
export async function getMoviesByMood(
  moodLabel: string,
  moodCategory: string,
  maxResults: number = 10
): Promise<TMDBMovie[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not set in environment variables");
  }

  const params = getMoodMovieParams(moodLabel, moodCategory);
  const url = new URL("https://api.themoviedb.org/3/discover/movie");
  
  url.searchParams.append("api_key", apiKey);
  url.searchParams.append("language", "en-US");
  url.searchParams.append("sort_by", params.sortBy || "popularity.desc");
  url.searchParams.append("page", "1");
  
  if (params.genreIds && params.genreIds.length > 0) {
    url.searchParams.append("with_genres", params.genreIds.join(","));
  }

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    const data: TMDBDiscoverResponse = await response.json();

    return data.results
      .slice(0, maxResults)
      .map((movie) => ({
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
  } catch (error) {
    console.error("Error fetching TMDB movies:", error);
    throw error;
  }
}
