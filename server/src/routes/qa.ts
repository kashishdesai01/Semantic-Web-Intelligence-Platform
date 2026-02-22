import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { pgPool } from "../dbpg";

const router = Router();

// GET /api/qa?limit=50
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      SELECT id, question, answer, answer_with_citations, citations, created_at
      FROM qa_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );
    return res.json({ items: result.rows });
  } catch (err: any) {
    console.error("QA LIST ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// POST /api/qa
router.post("/", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const { question, answer, answer_with_citations, citations } = req.body || {};
  if (!question || !answer) {
    return res.status(400).json({ error: "question and answer required" });
  }

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      INSERT INTO qa_history (user_id, question, answer, answer_with_citations, citations)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING id, created_at
      `,
      [
        userId,
        question,
        answer,
        answer_with_citations || null,
        JSON.stringify(citations || []),
      ]
    );
    return res.json({ ok: true, id: result.rows[0].id, created_at: result.rows[0].created_at });
  } catch (err: any) {
    console.error("QA CREATE ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
