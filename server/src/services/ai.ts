import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function callJson<T>(prompt: string): Promise<T> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
  });

  const raw = response.output_text;
  const cleaned = extractJson(raw);
  const normalized = fixInvalidBackslashes(cleaned);
  try {
    return JSON.parse(normalized) as T;
  } catch (err) {
    console.error("Failed to parse JSON from LLM:", raw);
    throw new Error("LLM returned invalid JSON");
  }
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const withoutFences = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = withoutFences.indexOf("{");
  const firstBracket = withoutFences.indexOf("[");
  let start = -1;
  let end = -1;

  if (firstBrace === -1 && firstBracket === -1) {
    return withoutFences;
  }

  if (firstBracket !== -1 && (firstBracket < firstBrace || firstBrace === -1)) {
    start = firstBracket;
    end = withoutFences.lastIndexOf("]");
  } else {
    start = firstBrace;
    end = withoutFences.lastIndexOf("}");
  }

  if (start !== -1 && end !== -1 && end > start) {
    return withoutFences.slice(start, end + 1);
  }

  return withoutFences;
}

function fixInvalidBackslashes(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }

    const next = input[i + 1];
    if (
      next === '"' ||
      next === "\\" ||
      next === "/" ||
      next === "b" ||
      next === "f" ||
      next === "n" ||
      next === "r" ||
      next === "t" ||
      next === "u"
    ) {
      out += ch;
      continue;
    }

    // Escape invalid backslash
    out += "\\\\";
  }
  return out;
}
