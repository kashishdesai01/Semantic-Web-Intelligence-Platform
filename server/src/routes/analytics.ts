import { Router } from "express";
import { pgPool } from "../dbpg";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const client = await pgPool.connect();
  try {
    const totals = await client.query(
      `
      SELECT
        (SELECT COUNT(*) FROM notes WHERE user_id = $1) AS total_notes,
        (SELECT COUNT(*) FROM sources WHERE user_id = $1) AS total_sources
      `,
      [userId]
    );

    const notesPerDay = await client.query(
      `
      SELECT
        date_trunc('day', created_at) AS day,
        COUNT(*) AS count
      FROM notes
      WHERE user_id = $1
        AND created_at >= now() - interval '30 days'
      GROUP BY day
      ORDER BY day ASC
      `,
      [userId]
    );

    const topDomains = await client.query(
      `
      SELECT s.domain, COUNT(*) AS count
      FROM notes n
      JOIN sources s ON s.id = n.source_id
      WHERE n.user_id = $1
        AND n.created_at >= now() - interval '30 days'
        AND s.domain IS NOT NULL
      GROUP BY s.domain
      ORDER BY count DESC
      LIMIT 10
      `,
      [userId]
    );

    const recentNotes = await client.query(
      `
      SELECT n.id, n.summary, n.key_insights, n.created_at,
             s.url, s.title, s.domain
      FROM notes n
      JOIN sources s ON s.id = n.source_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 10
      `,
      [userId]
    );

    return res.json({
      totals: totals.rows[0],
      notes_per_day: notesPerDay.rows,
      top_domains: topDomains.rows,
      recent_notes: recentNotes.rows,
    });
  } catch (err: any) {
    console.error("ANALYTICS ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
