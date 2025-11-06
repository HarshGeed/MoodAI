import { prisma } from "@/lib/prisma";
import { analyzeMood } from "@/lib/gemini";

export const moodResolvers = {
  Query: {
    getMoodHistory: async (_: any, { userId }: any) =>
      prisma.moodRecord.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
  },

  Mutation: {
    analyzeMood: async (_: any, { journalId }: any) => {
      const journal = await prisma.journal.findUnique({ where: { id: journalId } });
      if (!journal) throw new Error("Journal not found");

      // Analyze mood using OpenAI
      const { moodLabel, moodScore, moodCategory } = await analyzeMood(journal.content);

      // Save mood record
      const moodRecord = await prisma.moodRecord.create({
        data: {
          userId: journal.userId,
          journalId: journal.id,
          moodLabel,
          moodScore,
          moodCategory,
        },
      });

      // Update journal with mood label
      await prisma.journal.update({
        where: { id: journal.id },
        data: { mood: moodLabel },
      });

      return moodRecord;
    },
  },
};
