import { Pinecone } from "@pinecone-database/pinecone";
import { createEmbedding } from "./gemini";

if (!process.env.PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY is missing");
}

if (!process.env.PINECONE_INDEX) {
  throw new Error("PINECONE_INDEX is missing");
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const pineconeIndex = pinecone.Index(
  process.env.PINECONE_INDEX
);

/**
 * Store a vector embedding in Pinecone with metadata
 */
export async function upsertVector(
  id: string,
  text: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    const embedding = await createEmbedding(text);
    
    await pineconeIndex.upsert([
      {
        id,
        values: embedding,
        metadata,
      },
    ]);
  } catch (error) {
    console.error(`Error upserting vector ${id}:`, error);
    throw error;
  }
}

/**
 * Search for similar vectors in Pinecone
 */
export async function searchSimilar(
  text: string,
  topK: number = 10,
  filter?: Record<string, any>
): Promise<Array<{ id: string; score: number; metadata: Record<string, any> }>> {
  try {
    const embedding = await createEmbedding(text);
    
    const results = await pineconeIndex.query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter,
    });

    return results.matches.map((match) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata || {},
    }));
  } catch (error) {
    console.error("Error searching similar vectors:", error);
    throw error;
  }
}

export { pinecone, pineconeIndex };
