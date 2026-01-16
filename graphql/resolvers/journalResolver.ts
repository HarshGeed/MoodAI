import { prisma } from "@/lib/prisma";
import { createEmbedding } from "@/lib/gemini";
import { upsertVector } from "@/lib/pinecone";

export const journalResolvers = {
  Query: {
    getJournalsByUser: async (_: any, { userId }: any) =>
      prisma.journal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
  },

  Mutation: {
    createJournal: async (_: any, { userId, heading, content }: any) => {
      // Save journal in DB (embedding will be generated below)
      const journal = await prisma.journal.create({ 
        data: { userId, heading: heading || null, content } 
      });

      // Generate embedding ONCE when journal is created
      let vectorId: string | null = null;
      try {
        const textForEmbedding = heading ? `${heading}. ${content}` : content;
        vectorId = `journal-${journal.id}`;
        
        await upsertVector(
          vectorId,
          textForEmbedding,
          {
            userId,
            journalId: journal.id,
            type: "journal",
            heading: heading || null,
            createdAt: journal.createdAt.toISOString(),
          }
        );

        // Save vectorId to DB for future reference
        await prisma.journal.update({
          where: { id: journal.id },
          data: { vectorId },
        });

        console.log(`✓ Journal ${journal.id} embedding stored in Pinecone (vectorId: ${vectorId})`);
      } catch (error) {
        // Log error but don't fail journal creation
        console.error(`✗ Error embedding journal ${journal.id}:`, error);
        // vectorId remains null, fallback to keyword-based recommendations will be used
      }

      return {
        ...journal,
        vectorId: vectorId || journal.vectorId, // Return vectorId if successful
      };
    },
  },
};
