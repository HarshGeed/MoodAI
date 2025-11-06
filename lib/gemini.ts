import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Initialize Gemini client
export const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY!
);


//  Generate text embeddings (for Pinecone)


export async function createEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" }); 
  // confirm the model once

  const result = await model.embedContent(text);

  // The embedding vector
  return result.embedding.values;
}


// Analyze mood (via text classification)


export async function analyzeMood(text: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  // You can switch to "gemini-1.5-pro" for better reasoning if needed.

  const prompt = `
You are a mood analysis assistant.
Analyze the user's journal text and output a short JSON object like:
{
  "moodLabel": "Happy",
  "moodScore": 0.87,
  "moodCategory": "Positive"
}

Rules:
- moodLabel should be one of ["Happy", "Sad", "Angry", "Calm", "Stressed", "Neutral"]
- moodScore should be a number between 0 and 1.
- moodCategory should be "Positive", "Negative", or "Neutral".

Text: """${text}"""
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const json = JSON.parse(responseText);
    return {
      moodLabel: json.moodLabel ?? "Neutral",
      moodScore: json.moodScore ?? 0.5,
      moodCategory:
        json.moodCategory ?? (json.moodScore > 0.6 ? "Positive" : "Negative"),
    };
  } catch {
    // fallback if JSON parse fails
    return { moodLabel: "Neutral", moodScore: 0.5, moodCategory: "Neutral" };
  }
}
