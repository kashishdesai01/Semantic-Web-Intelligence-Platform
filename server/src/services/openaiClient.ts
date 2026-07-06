import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Fail fast instead of hanging request handlers (and exhausting the DB pool)
  // when the OpenAI API is slow or unresponsive.
  timeout: 10_000,
  maxRetries: 1,
});
