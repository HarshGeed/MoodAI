import { prisma } from "@/lib/prisma";
import { analyzeMood } from "@/lib/gemini";
import { searchSimilar } from "@/lib/pinecone";
import { getYouTubeRecommendationsByMood, storeYouTubeVideoEmbedding } from "@/lib/youtube";
import { getMoviesByMood, storeMovieEmbedding } from "@/lib/tmdb";

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
      });

      if (!latestMoodRecord) {
        throw new Error("No mood records found. Please create a journal entry and analyze your mood first.");
      }

      // Get YouTube recommendations (videos and songs)
      const { videos: youtubeVideos, songs: youtubeSongs } =
        await getYouTubeRecommendationsByMood(
          latestMoodRecord.moodLabel,
          latestMoodRecord.moodCategory || ""
        );

      // Get TMDB movie recommendations
      const movies = await getMoviesByMood(
        latestMoodRecord.moodLabel,
        latestMoodRecord.moodCategory || ""
      );

      return {
        moodLabel: latestMoodRecord.moodLabel,
        moodCategory: latestMoodRecord.moodCategory,
        moodScore: latestMoodRecord.moodScore,
        youtubeVideos,
        youtubeSongs,
        movies,
      };
    },
  },

  Mutation: {
    generateRecommendation: async (_: any, { moodRecordId }: any) => {
      const moodRecord = await prisma.moodRecord.findUnique({
        where: { id: moodRecordId },
      });
      if (!moodRecord) throw new Error("Mood record not found");

      // Generate simple recommendations based on mood
      const suggestions: Record<string, string[]> = {
        Happy: ["Keep a gratitude journal", "Share positivity with others"],
        Sad: ["Go for a walk", "Listen to calm music"],
        Angry: ["Try deep breathing", "Write about your feelings"],
        Stressed: ["Do a short meditation", "Avoid screens before sleep"],
        Neutral: ["Reflect on your goals", "Plan your next day"],
      };

      const content = suggestions[moodRecord.moodLabel] || ["Take a break", "Smile :)"];

      const recommendation = await prisma.recommendation.create({
        data: {
          userId: moodRecord.userId,
          moodRecordId,
          type: "Mood-based",
          content: { suggestions: content },
        },
      });

      return recommendation;
    },

    generateMoodBasedRecommendations: async (_: any, { userId }: any) => {
      // Get the most recent mood record for the user
      const latestMoodRecord = await prisma.moodRecord.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { journal: true },
      });

      if (!latestMoodRecord) {
        throw new Error("No mood records found. Please create a journal entry and analyze your mood first.");
      }

      // Get the associated journal entry
      const journal = latestMoodRecord.journal;
      if (!journal) {
        throw new Error("No journal entry associated with mood record.");
      }

      let youtubeVideos: any[] = [];
      let youtubeSongs: any[] = [];
      let movies: any[] = [];

      // Use vector similarity search if embedding exists
      if (journal.vectorId) {
        try {
          // Search for similar content using journal embedding
          const similarResults = await searchSimilar(
            journal.content,
            15,
            { userId } // Optional filter by user if needed
          );

          // Separate results by type
          youtubeVideos = similarResults
            .filter((r: any) => r.metadata.source === "youtube" && r.metadata.type === "video")
            .slice(0, 5)
            .map((r: any) => ({
              videoId: r.metadata.videoId,
              title: r.metadata.title,
              description: "",
              thumbnail: r.metadata.thumbnail,
              channelTitle: r.metadata.channelTitle,
              publishedAt: r.metadata.publishedAt,
              similarity: r.score,
            }));

          youtubeSongs = similarResults
            .filter((r: any) => r.metadata.source === "youtube" && r.metadata.type === "song")
            .slice(0, 5)
            .map((r: any) => ({
              videoId: r.metadata.videoId,
              title: r.metadata.title,
              description: "",
              thumbnail: r.metadata.thumbnail,
              channelTitle: r.metadata.channelTitle,
              publishedAt: r.metadata.publishedAt,
              similarity: r.score,
            }));

          movies = similarResults
            .filter((r: any) => r.metadata.source === "tmdb" && r.metadata.type === "movie")
            .slice(0, 5)
            .map((r: any) => ({
              id: r.metadata.movieId,
              title: r.metadata.title,
              overview: "",
              posterPath: r.metadata.posterPath,
              releaseDate: r.metadata.releaseDate,
              voteAverage: r.metadata.voteAverage,
              genreIds: r.metadata.genreIds,
              similarity: r.score,
            }));

          console.log(`✓ Retrieved ${youtubeVideos.length} videos, ${youtubeSongs.length} songs, ${movies.length} movies via vector similarity`);
        } catch (error) {
          console.error("Error with vector similarity search, falling back to mood-based:", error);
          
          // Fallback to mood-based recommendations
          const { videos: fallbackVideos, songs: fallbackSongs } =
            await getYouTubeRecommendationsByMood(
              latestMoodRecord.moodLabel,
              latestMoodRecord.moodCategory || ""
            );
          youtubeVideos = fallbackVideos;
          youtubeSongs = fallbackSongs;
          movies = await getMoviesByMood(latestMoodRecord.moodLabel);
        }
      } else {
        // No embedding yet, use mood-based recommendations
        const { videos: fallbackVideos, songs: fallbackSongs } =
          await getYouTubeRecommendationsByMood(
            latestMoodRecord.moodLabel,
            latestMoodRecord.moodCategory || ""
          );
        youtubeVideos = fallbackVideos;
        youtubeSongs = fallbackSongs;
        movies = await getMoviesByMood(latestMoodRecord.moodLabel);
      }

      // Store embeddings for recommended items (for future vector comparisons)
      try {
        for (const video of youtubeVideos) {
          await storeYouTubeVideoEmbedding(video, "video");
        }
        for (const song of youtubeSongs) {
          await storeYouTubeVideoEmbedding(song, "song");
        }
        for (const movie of movies) {
          await storeMovieEmbedding(movie);
        }
      } catch (error) {
        console.warn("Error storing embeddings for recommendations:", error);
      }

      // Save recommendations to database
      const recommendation = await prisma.recommendation.create({
        data: {
          userId,
          moodRecordId: latestMoodRecord.id,
          type: "Vector-Based-Media",
          content: {
            youtubeVideos,
            youtubeSongs,
            movies,
            searchMethod: journal.vectorId ? "vector-similarity" : "mood-based",
          } as any,
        },
      });

      return {
        moodLabel: latestMoodRecord.moodLabel,
        moodCategory: latestMoodRecord.moodCategory,
        moodScore: latestMoodRecord.moodScore,
        youtubeVideos,
        youtubeSongs,
        movies,
        searchMethod: journal.vectorId ? "vector-similarity" : "mood-based",
      };
    },
  },
};
