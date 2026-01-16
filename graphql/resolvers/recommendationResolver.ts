import { prisma } from "@/lib/prisma";
import { searchSimilar, getVector } from "@/lib/pinecone";
import { getYouTubeRecommendationsByMood, storeYouTubeVideoEmbedding } from "@/lib/youtube";
import { getMoviesByMood, storeMovieEmbedding } from "@/lib/tmdb";

/**
 * Helper: Re-rank API results using vector similarity
 * After fetching keyword-based results, compare them with journal embedding
 */
async function reRankAPIResults(
  items: any[],
  itemType: "movie" | "video" | "song",
  journalContent: string
): Promise<any[]> {
  try {
    // Create text representations for each item
    const itemsWithScores = await Promise.all(
      items.map(async (item) => {
        let textContent = "";
        
        if (itemType === "movie") {
          textContent = `${item.title}. ${item.overview}`;
        } else {
          textContent = `${item.title}. ${item.description}`;
        }

        try {
          // Search for similarity between journal and this item
          const results = await searchSimilar(textContent, 1);
          const similarity = results.length > 0 ? results[0].score : 0;
          
          return { ...item, similarity };
        } catch (error) {
          console.warn(`⚠ Could not compute similarity for ${itemType}:`, error);
          return { ...item, similarity: 0 };
        }
      })
    );

    // Sort by similarity score (highest first)
    return itemsWithScores.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  } catch (error) {
    console.warn(`⚠ Error re-ranking ${itemType} results:`, error);
    // Return original order if re-ranking fails
    return items;
  }
}

export const recommendationResolvers = {
  Query: {
    getRecommendations: async (_: any, { userId }: any) =>
      prisma.recommendation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),

    getMoodBasedRecommendations: async (_: any, { userId }: any) => {
      // Get the most recent mood record for the user
      const latestMoodRecord = await prisma.moodRecord.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { journal: true },
      });

      if (!latestMoodRecord) {
        throw new Error("No mood records found. Please create a journal entry first.");
      }

      const journal = latestMoodRecord.journal;
      if (!journal) {
        throw new Error("No journal entry associated with mood record.");
      }

      let youtubeVideos: any[] = [];
      let youtubeSongs: any[] = [];
      let movies: any[] = [];
      let searchMethod = "mood-keyword"; // Default fallback

      // STEP 1: Try vector-similarity search (PRIMARY approach)
      if (journal.vectorId) {
        try {
          console.log(`\n🔍 Starting vector-similarity search for journal: ${journal.id}`);
          
          const similarResults = await searchSimilar(
            journal.content,
            20 // Top 20 results
          );

          console.log(`✓ Vector search returned ${similarResults.length} results`);

          // Filter and categorize by source and type
          youtubeVideos = similarResults
            .filter((r) => r.metadata.source === "youtube" && r.metadata.type === "video")
            .slice(0, 15)
            .map((r) => ({
              videoId: r.metadata.videoId,
              title: r.metadata.title,
              description: "",
              thumbnail: r.metadata.thumbnail,
              channelTitle: r.metadata.channelTitle,
              publishedAt: r.metadata.publishedAt,
              similarity: Math.round(r.score * 100) / 100, // Round to 2 decimals
            }));

          youtubeSongs = similarResults
            .filter((r) => r.metadata.source === "youtube" && r.metadata.type === "song")
            .slice(0, 15)
            .map((r) => ({
              videoId: r.metadata.videoId,
              title: r.metadata.title,
              description: "",
              thumbnail: r.metadata.thumbnail,
              channelTitle: r.metadata.channelTitle,
              publishedAt: r.metadata.publishedAt,
              similarity: Math.round(r.score * 100) / 100,
            }));

          movies = similarResults
            .filter((r) => r.metadata.source === "tmdb" && r.metadata.type === "movie")
            .slice(0, 15)
            .map((r) => ({
              id: r.metadata.movieId,
              title: r.metadata.title,
              overview: "",
              posterPath: r.metadata.posterPath,
              releaseDate: r.metadata.releaseDate,
              voteAverage: r.metadata.voteAverage,
              genreIds: r.metadata.genreIds,
              similarity: Math.round(r.score * 100) / 100,
            }));

          searchMethod = "vector-similarity";

          // Check if we have sufficient results
          const totalResults = youtubeVideos.length + youtubeSongs.length + movies.length;
          if (totalResults === 0) {
            console.warn(`⚠ Vector search returned no results, falling back to keyword-based`);
            throw new Error("Insufficient vector results");
          }

          console.log(
            `✓ Vector-similarity successful: ${youtubeVideos.length} videos, ` +
            `${youtubeSongs.length} songs, ${movies.length} movies`
          );
        } catch (error) {
          console.warn(`⚠ Vector search failed, falling back to keyword-based:`, error);
          searchMethod = "mood-keyword";
        }
      } else {
        console.log(`⊘ No embedding for journal ${journal.id}, using keyword-based approach`);
      }

      // STEP 2: Fallback to keyword-based recommendations if needed
      if (
        searchMethod === "mood-keyword" ||
        (youtubeVideos.length === 0 && youtubeSongs.length === 0 && movies.length === 0)
      ) {
        try {
          console.log(`\n🔑 Starting keyword-based search for mood: ${latestMoodRecord.moodLabel}`);

          // Fetch API results with error handling for each service
          let apiVideos: any[] = [];
          let apiSongs: any[] = [];
          let apiMovies: any[] = [];

          // Try YouTube API
          try {
            const youtubeResults = await getYouTubeRecommendationsByMood(
              latestMoodRecord.moodLabel,
              latestMoodRecord.moodCategory || ""
            );
            apiVideos = youtubeResults.videos;
            apiSongs = youtubeResults.songs;
            console.log(`✓ YouTube API: ${apiVideos.length} videos, ${apiSongs.length} songs`);
          } catch (youtubeError: any) {
            console.error(`✗ YouTube API failed:`, youtubeError.message);
            // Continue without YouTube results
          }

          // Try TMDB API
          try {
            apiMovies = await getMoviesByMood(latestMoodRecord.moodLabel, 20);
            console.log(`✓ TMDB API: ${apiMovies.length} movies`);
          } catch (tmdbError: any) {
            console.error(`✗ TMDB API failed:`, tmdbError.message);
            // Continue without movie results
          }

          // STEP 3: Re-rank API results using embeddings (HYBRID upgrade) - only if we have results
          if (journal.vectorId && (apiVideos.length > 0 || apiSongs.length > 0 || apiMovies.length > 0)) {
            try {
              console.log(`\n🔄 Re-ranking API results using embeddings...`);

              if (apiVideos.length > 0) {
                youtubeVideos = await reRankAPIResults(apiVideos, "video", journal.content);
              }
              if (apiSongs.length > 0) {
                youtubeSongs = await reRankAPIResults(apiSongs, "song", journal.content);
              }
              if (apiMovies.length > 0) {
                movies = await reRankAPIResults(apiMovies, "movie", journal.content);
              }

              searchMethod = "keyword-reranked";
              console.log(`✓ Results re-ranked using embeddings`);
            } catch (error) {
              console.warn(`⚠ Re-ranking failed, using API order:`, error);
              youtubeVideos = apiVideos;
              youtubeSongs = apiSongs;
              movies = apiMovies;
            }
          } else {
            youtubeVideos = apiVideos;
            youtubeSongs = apiSongs;
            movies = apiMovies;
          }
        } catch (error) {
          console.error(`✗ Keyword-based search failed:`, error);
          // Return empty results gracefully - already initialized above
        }
      }

      // STEP 4: Store recommended content embeddings for future comparisons
      const embeddingPromises: Promise<void>[] = [];

      youtubeVideos.forEach((video) => {
        embeddingPromises.push(
          storeYouTubeVideoEmbedding(video, "video").catch((error) =>
            console.warn(`⚠ Failed to embed video ${video.videoId}:`, error)
          )
        );
      });

      youtubeSongs.forEach((song) => {
        embeddingPromises.push(
          storeYouTubeVideoEmbedding(song, "song").catch((error) =>
            console.warn(`⚠ Failed to embed song ${song.videoId}:`, error)
          )
        );
      });

      movies.forEach((movie) => {
        embeddingPromises.push(
          storeMovieEmbedding(movie).catch((error) =>
            console.warn(`⚠ Failed to embed movie ${movie.id}:`, error)
          )
        );
      });

      // Wait for all embeddings without blocking response
      Promise.all(embeddingPromises).catch((error) =>
        console.warn(`⚠ Some embeddings failed:`, error)
      );

      // STEP 5: Store recommendation in database
      try {
        const recommendation = await prisma.recommendation.create({
          data: {
            userId,
            moodRecordId: latestMoodRecord.id,
            type: "Vector-Based-Media",
            content: {
              youtubeVideos,
              youtubeSongs,
              movies,
              searchMethod,
              moodLabel: latestMoodRecord.moodLabel,
              moodScore: latestMoodRecord.moodScore,
              moodCategory: latestMoodRecord.moodCategory,
              timestamp: new Date().toISOString(),
            } as any,
          },
        });

        console.log(`✓ Recommendation stored: ${recommendation.id} (${searchMethod})`);
      } catch (error) {
        console.error(`✗ Error storing recommendation:`, error);
      }

      // Return response with similarity scores and metadata
      return {
        moodLabel: latestMoodRecord.moodLabel,
        moodScore: latestMoodRecord.moodScore,
        moodCategory: latestMoodRecord.moodCategory,
        youtubeVideos,
        youtubeSongs,
        movies,
        searchMethod,
        totalResults: youtubeVideos.length + youtubeSongs.length + movies.length,
      };
    },
  },

  Mutation: {
    generateRecommendation: async (_: any, { moodRecordId }: any) => {
      const moodRecord = await prisma.moodRecord.findUnique({
        where: { id: moodRecordId },
        include: { journal: true },
      });

      if (!moodRecord) throw new Error("Mood record not found");

      // Use the Query resolver to generate recommendations
      const recommendations = await recommendationResolvers.Query.getMoodBasedRecommendations(
        null,
        { userId: moodRecord.userId }
      );

      return recommendations;
    },

    generateMoodBasedRecommendations: async (_: any, { userId }: any) => {
      // Delegate to Query resolver
      return recommendationResolvers.Query.getMoodBasedRecommendations(null, { userId });
    },
  },
};
