import { Router } from "express";
import { pgPool } from "../dbpg";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/sources?limit=50
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      SELECT id, url, title, domain, first_seen_at
      FROM sources
      WHERE user_id = $1
      ORDER BY first_seen_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );
    return res.json({ sources: result.rows });
  } catch (err: any) {
    console.error("SOURCES LIST ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
