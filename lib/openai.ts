import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Generate embedding vector from text
export async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Basic mood classifier using GPT
export async function analyzeMood(text: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a mood analysis assistant. Analyze the text and output a concise mood label (like Happy, Sad, Angry, Calm, Stressed) and a mood score (0–1). Respond in JSON format.",
      },
      { role: "user", content: text },
    ],
  });

  try {
    const json = JSON.parse(response.choices[0].message.content ?? "{}");
    return {
      moodLabel: json.moodLabel ?? "Neutral",
      moodScore: json.moodScore ?? 0.5,
      moodCategory:
        json.moodCategory ?? (json.moodScore > 0.6 ? "Positive" : "Negative"),
    };
  } catch {
    return { moodLabel: "Neutral", moodScore: 0.5, moodCategory: "Neutral" };
  }
}
