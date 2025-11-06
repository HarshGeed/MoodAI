import { prisma } from "@/lib/prisma";
import { createEmbedding } from "@/lib/gemini";
import { pineconeIndex } from "@/lib/pinecone";

export const journalResolvers = {
  Query: {
    getJournalsByUser: async (_: any, { userId }: any) =>
      prisma.journal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
  },

  Mutation: {
    createJournal: async (_: any, { userId, content }: any) => {
      // Save journal in DB
      const journal = await prisma.journal.create({ data: { userId, content } });

      // Generate embedding
      const embedding = await createEmbedding(content);

      // Store in Pinecone
      await pineconeIndex.upsert([
        {
          id: journal.id,
          values: embedding,
          metadata: { userId, content, createdAt: journal.createdAt.toISOString() },
        },
      ]);

      // Save vector ID
      await prisma.journal.update({
        where: { id: journal.id },
        data: { vectorId: journal.id },
      });

      return journal;
    },
  },
};
