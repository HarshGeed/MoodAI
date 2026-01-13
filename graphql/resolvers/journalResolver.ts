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
    createJournal: async (_: any, { userId, heading, content }: any) => {
      // Save journal in DB
      const journal = await prisma.journal.create({ 
        data: { userId, heading: heading || null, content } 
      });

      // Generate embedding and store in Pinecone (if configured)
      if (pineconeIndex) {
        try {
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

          console.log(`✓ Journal ${journal.id} stored in Pinecone successfully`);
        } catch (error) {
          // Log error but don't fail the journal creation
          console.error("Error storing journal in Pinecone:", error);
        }
      } else {
        console.warn("Pinecone is not configured. PINECONE_INDEX environment variable is missing.");
      }

      return journal;
    },
  },
};
