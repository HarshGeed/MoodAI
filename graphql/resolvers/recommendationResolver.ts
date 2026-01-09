import { prisma } from "@/lib/prisma";
import { analyzeMood } from "@/lib/gemini";
import { getYouTubeRecommendationsByMood } from "@/lib/youtube";
import { getMoviesByMood } from "@/lib/tmdb";

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

      // Save recommendations to database
      const recommendation = await prisma.recommendation.create({
        data: {
          userId,
          moodRecordId: latestMoodRecord.id,
          type: "Mood-Based-Media",
          content: {
            youtubeVideos,
            youtubeSongs,
            movies,
          } as any, // Prisma JSON type
        },
      });

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
};
