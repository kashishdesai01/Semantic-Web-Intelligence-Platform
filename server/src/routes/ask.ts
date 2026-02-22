import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { embedText } from "../services/embeddings";
import { pgPool } from "../dbpg";
import { callJson } from "../services/ai";
import rateLimit from "express-rate-limit";
import { cacheGet, cacheSet, consumeDailyBudget } from "../queue";

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) =>
    String((req as any).user?.id || req.ip),
});

// POST /api/ask { question }
router.post("/", requireAuth, limiter, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const { question } = req.body || {};
  if (!question) return res.status(400).json({ error: "question is required" });

  const budgetKey = `budget:ask:${userId}`;
  const budget = await consumeDailyBudget(
    budgetKey,
    Number(process.env.DAILY_ASK_LIMIT || 50)
  );
  if (!budget.ok) {
    return res.status(429).json({ error: "Daily ask limit reached" });
  }

  const cacheKey = `ask:${userId}:${question}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const vector = await embedText(String(question));
  if (!vector || vector.length === 0) {
    return res.status(500).json({ error: "Embedding failed" });
  }

  const vectorStr = `[${vector.join(",")}]`;
  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      SELECT n.id, n.summary, n.key_insights, n.highlights,
             s.url, s.title
      FROM note_embeddings ne
      JOIN notes n ON n.id = ne.note_id
      JOIN sources s ON s.id = n.source_id
      WHERE n.user_id = $1
      ORDER BY (ne.embedding <=> $2::vector) ASC
      LIMIT 5
      `,
      [userId, vectorStr]
    );

    if (result.rowCount === 0) {
      return res.json({ answer: "No notes found yet.", citations: [] });
    }

    const notesContext = result.rows
      .map(
        (n: any) =>
          `Note ${n.id} | ${n.title || "Untitled"} | ${n.url}\nSummary: ${
            n.summary
          }\nKey insights: ${(n.key_insights || []).join("; ")}\nHighlights: ${
            (n.highlights || []).join("; ") || "None"
          }`
      )
      .join("\n\n");

    const prompt = `
You are an assistant that answers questions using ONLY the provided notes.
Return STRICT JSON with this shape:
{
  "answer": string,             // concise answer, 2-5 sentences
  "citations": { "note_id": number, "title": string, "url": string, "highlights": string[] }[],
  "answer_with_citations": string  // same answer but with inline citations like [1], [2]
}
Rules:
- Do not use outside knowledge.
- If notes are insufficient, say so briefly and cite the closest notes.
- The inline citations must reference the order of items in "citations".

Question: ${question}

Notes:
${notesContext}
`.trim();

    const json = await callJson<{
      answer: string;
      citations: { note_id: number; title: string; url: string; highlights: string[] }[];
      answer_with_citations: string;
    }>(prompt);

    await cacheSet(cacheKey, json, 6 * 60 * 60);
    return res.json(json);
  } catch (err: any) {
    console.error("ASK ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
