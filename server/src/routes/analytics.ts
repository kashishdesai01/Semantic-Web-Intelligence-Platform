import { Router } from "express";
import { pgPool } from "../dbpg";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const range = String(req.query.range || "month");
  const days =
    range === "week"
      ? 7
      : range === "month"
        ? 30
        : range === "6months"
          ? 180
          : range === "year"
            ? 365
            : 30;
  try {
    // These four queries are independent. Using pgPool.query (rather than a
    // single checked-out client) lets the pool run them on separate
    // connections, so Promise.all gives real parallelism.
    const [totals, notesPerDay, topDomains, recentNotes] = await Promise.all([
      pgPool.query(
        `
        SELECT
          (SELECT COUNT(*) FROM notes WHERE user_id = $1) AS total_notes,
          (SELECT COUNT(*) FROM sources WHERE user_id = $1) AS total_sources
        `,
        [userId]
      ),
      pgPool.query(
        `
        SELECT
          date_trunc('day', created_at) AS day,
          COUNT(*) AS count
        FROM notes
        WHERE user_id = $1
          AND created_at >= now() - ($2::text || ' days')::interval
        GROUP BY day
        ORDER BY day ASC
        `,
        [userId, String(days)]
      ),
      pgPool.query(
        `
        SELECT s.domain, COUNT(*) AS count
        FROM notes n
        JOIN sources s ON s.id = n.source_id
        WHERE n.user_id = $1
          AND n.created_at >= now() - ($2::text || ' days')::interval
          AND s.domain IS NOT NULL
        GROUP BY s.domain
        ORDER BY count DESC
        LIMIT 10
        `,
        [userId, String(days)]
      ),
      pgPool.query(
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
      ),
    ]);

    return res.json({
      totals: totals.rows[0],
      notes_per_day: notesPerDay.rows,
      top_domains: topDomains.rows,
      recent_notes: recentNotes.rows,
    });
  } catch (err: any) {
    console.error("ANALYTICS ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
