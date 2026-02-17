import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function embedText(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set. Skipping embeddings.");
    return null;
  }

  const model = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
  const input = text.trim();
  if (!input) return null;

  const response = await openai.embeddings.create({
    model,
    input,
    encoding_format: "float",
  });

  const vector = response.data?.[0]?.embedding;
  return Array.isArray(vector) ? vector : null;
}
