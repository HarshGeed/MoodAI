import { prisma } from "@/lib/prisma";
import { analyzeMood } from "@/lib/openai";

export const recommendationResolvers = {
  Query: {
    getRecommendations: async (_: any, { userId }: any) =>
      prisma.recommendation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
  },

  Mutation: {
    generateRecommendation: async (_: any, { moodRecordId }: any) => {
      const moodRecord = await prisma.moodRecord.findUnique({
        where: { id: moodRecordId },
      });
      if (!moodRecord) throw new Error("Mood record not found");

      // Generate simple recommendations based on mood
      const suggestions = {
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
  },
};
