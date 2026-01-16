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
 * In-memory cache for embeddings (avoid regenerating same text)
 * Key: text (hashed), Value: embedding vector
 */
const embeddingCache = new Map<string, number[]>();

/**
 * Simple hash function for caching text embeddings
 */
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

/**
 * Get or create embedding with caching
 */
async function getEmbedding(text: string): Promise<number[]> {
  const textHash = hashText(text);
  
  // Check cache first
  if (embeddingCache.has(textHash)) {
    console.log(`✓ Embedding retrieved from cache`);
    return embeddingCache.get(textHash)!;
  }
  
  // Generate new embedding
  const embedding = await createEmbedding(text);
  embeddingCache.set(textHash, embedding);
  console.log(`✓ New embedding created and cached`);
  
  return embedding;
}

/**
 * Check if vector already exists in Pinecone
 */
async function vectorExists(id: string): Promise<boolean> {
  try {
    const result = await pineconeIndex.fetch([id]);
    return Object.keys(result.records).length > 0;
  } catch (error) {
    console.error(`Error checking vector existence: ${id}`, error);
    return false;
  }
}

/**
 * Store a vector embedding in Pinecone with metadata
 * Avoids duplicates by checking if ID already exists
 */
export async function upsertVector(
  id: string,
  text: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    // Check if already exists
    const exists = await vectorExists(id);
    if (exists) {
      console.log(`⊘ Vector ${id} already exists, skipping upsert`);
      return;
    }

    const embedding = await getEmbedding(text);
    
    await pineconeIndex.upsert([
      {
        id,
        values: embedding,
        metadata,
      },
    ]);

    console.log(`✓ Vector ${id} upserted successfully`);
  } catch (error) {
    console.error(`✗ Error upserting vector ${id}:`, error);
    throw error;
  }
}

/**
 * Search for similar vectors in Pinecone with detailed results
 */
export async function searchSimilar(
  text: string,
  topK: number = 15,
  filter?: Record<string, any>
): Promise<Array<{ id: string; score: number; metadata: Record<string, any> }>> {
  try {
    const embedding = await getEmbedding(text);
    
    const results = await pineconeIndex.query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter,
    });

    const matches = results.matches.map((match) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata || {},
    }));

    console.log(`✓ Found ${matches.length} similar vectors (top ${topK})`);
    return matches;
  } catch (error) {
    console.error(`✗ Error searching similar vectors:`, error);
    throw error;
  }
}

/**
 * Delete a vector from Pinecone
 */
export async function deleteVector(id: string): Promise<void> {
  try {
    await pineconeIndex.deleteOne(id);
    console.log(`✓ Vector ${id} deleted`);
  } catch (error) {
    console.error(`✗ Error deleting vector ${id}:`, error);
    throw error;
  }
}

/**
 * Get vector details from Pinecone
 */
export async function getVector(id: string): Promise<any | null> {
  try {
    const result = await pineconeIndex.fetch([id]);
    if (Object.keys(result.records).length > 0) {
      return result.records[id];
    }
    return null;
  } catch (error) {
    console.error(`✗ Error fetching vector ${id}:`, error);
    return null;
  }
}

export { pinecone, pineconeIndex };
