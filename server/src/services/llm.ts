import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type SummarizeInput = {
  title?: string;
  url?: string;
  content: string;
};

export type SummarizeResult = {
  summary: string;
  key_insights: string[];
};

export async function summarizeContent(
  input: SummarizeInput
): Promise<SummarizeResult> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set. Falling back to stub summary.");
    return fallbackSummary(input);
  }

  const { title, url } = input;

  // To control token usage, truncate very long pages
  const MAX_CHARS = 6000;
  const content =
    input.content.length > MAX_CHARS
      ? input.content.slice(0, MAX_CHARS) +
        "\n\n[Content truncated for summarization]"
      : input.content;

  const prompt = `
You are an assistant that summarizes web pages for a personal knowledge base.

Given the title, URL, and raw text content of a page, you must return a STRICT JSON object with this TypeScript type:

{
  "summary": string,          // 4–7 sentences, clear and neutral
  "key_insights": string[]    // 3–7 bullet-level insights, concise
}

Rules:
- Output VALID JSON ONLY. No extra text, no markdown, no comments.
- "key_insights" should capture the most important facts, arguments, or takeaways.
- If the content is noisy (navigation, ads), ignore that and focus on the main article.

Title: ${title || "Untitled"}
URL: ${url || "Unknown"}

Page content:
${content}
`.trim();

  const response = await openai.responses.create({
    model: "gpt-4o-mini", // or another model you prefer
    input: prompt,
  });

  const raw = response.output_text; // helper that concatenates text output

  let parsed: SummarizeResult;

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse LLM JSON, raw output:", raw);
    // Graceful fallback: wrap raw text as summary
    return {
      summary: raw,
      key_insights: [],
    };
  }

  // Basic validation
  if (!parsed.summary || !Array.isArray(parsed.key_insights)) {
    console.error("LLM JSON missing fields, raw:", raw);
    return {
      summary: parsed.summary || raw,
      key_insights: parsed.key_insights || [],
    };
  }

  return parsed;
}

function fallbackSummary(input: SummarizeInput): SummarizeResult {
  const { title, content } = input;
  const maxPreview = 300;
  const preview =
    content.length > maxPreview
      ? content.slice(0, maxPreview) + "..."
      : content;

  return {
    summary: `Stub summary for "${
      title || "Untitled"
    }". Content preview: ${preview}`,
    key_insights: [
      "This is a stub insight. Replace with real LLM output.",
      "Set OPENAI_API_KEY in the server .env file to enable real summaries.",
    ],
  };
}
