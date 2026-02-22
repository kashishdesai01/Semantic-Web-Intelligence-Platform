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

// POST /api/recall { query }
router.post("/", requireAuth, limiter, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: "query is required" });

  const budgetKey = `budget:recall:${userId}`;
  const budget = await consumeDailyBudget(
    budgetKey,
    Number(process.env.DAILY_RECALL_LIMIT || 50)
  );
  if (!budget.ok) {
    return res.status(429).json({ error: "Daily recall limit reached" });
  }

  const cacheKey = `recall:${userId}:${query}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const vector = await embedText(String(query));
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
      return res.json({ answer: "No notes found yet.", sources: [] });
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
You are retrieving a memory from the user's notes.
Return STRICT JSON with this shape:
{
  "answer": string,
  "sources": { "note_id": number, "title": string, "url": string, "highlights": string[] }[]
}
Rules:
- Answer briefly.
- Cite relevant sources from the notes.

Query: ${query}

Notes:
${notesContext}
`.trim();

    const json = await callJson<{
      answer: string;
      sources: { note_id: number; title: string; url: string; highlights: string[] }[];
    }>(prompt);

    await cacheSet(cacheKey, json, 6 * 60 * 60);
    return res.json(json);
  } catch (err: any) {
    console.error("RECALL ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
