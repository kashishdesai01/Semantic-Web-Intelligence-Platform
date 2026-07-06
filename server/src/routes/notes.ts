
import { Router } from "express";
import { summarizeContent } from "../services/llm";
import { embedText } from "../services/embeddings";
import { pgPool } from "../dbpg";
import { requireAuth } from "../middleware/auth";
import { aiQueue } from "../queue";
import rateLimit from "express-rate-limit";

const router = Router();

const summarizeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => String(req.ip),
  message: { error: "Too many summarize requests. Please try again later." },
});

// POST /api/notes/summarize
router.post("/summarize", summarizeLimiter, async (req, res) => {
  try {
    const { title, url, content } = req.body;
    if (!content) return res.status(400).json({ error: "content is required" });

    const result = await summarizeContent({ title, url, content });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notes/save
router.post("/save", requireAuth, async (req, res) => {
  const client = await pgPool.connect();
  try {
    const user = req.user!;
    const { title, url, summary, key_insights, highlights } = req.body;

    if (!url || !summary) {
      return res.status(400).json({ error: "url and summary are required" });
    }

    const domain = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return null;
      }
    })();

    await client.query("BEGIN");

    // Upsert source
    const upsertSource = await client.query(
      `
      INSERT INTO sources (user_id, url, title, domain)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, url)
      DO UPDATE SET title = EXCLUDED.title, domain = EXCLUDED.domain
      RETURNING id
      `,
      [user.id, url, title || null, domain]
    );

    const sourceId = upsertSource.rows[0].id as number;

    // Insert note
    const insertNote = await client.query(
      `
      INSERT INTO notes (user_id, source_id, summary, key_insights, highlights)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
      RETURNING id
      `,
      [
        user.id,
        sourceId,
        summary,
        JSON.stringify(key_insights || []),
        JSON.stringify(highlights || []),
      ]
    );

    const noteId = insertNote.rows[0].id as number;

    await client.query("COMMIT");

    // Embed asynchronously so the save returns immediately. The embedding job
    // is processed by the worker; search/ask will find the note once it lands.
    const embedInput = [
      `Summary: ${summary}`,
      `Key insights: ${(key_insights || []).join(" | ")}`,
      `Title: ${title || ""}`,
      `URL: ${url}`,
    ]
      .filter(Boolean)
      .join("\n");

    aiQueue
      .add(
        "embed-note",
        { noteId, embedInput },
        {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        }
      )
      .catch((e) =>
        console.warn("Failed to enqueue embed-note:", e?.message || e)
      );

    res.json({ ok: true, note_id: noteId });
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    console.error("SAVE ERROR:", err?.message || err);
    if (err?.stack) console.error(err.stack);

    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// GET /api/notes?limit=50
router.get("/", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      SELECT n.id, n.summary, n.key_insights, n.highlights, n.created_at,
             s.url, s.title, s.domain,
             (nl.note_id IS NOT NULL) AS liked
      FROM notes n
      JOIN sources s ON s.id = n.source_id
      LEFT JOIN note_likes nl ON nl.note_id = n.id AND nl.user_id = $1
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );
    return res.json({ notes: result.rows });
  } catch (err: any) {
    console.error("NOTES LIST ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// GET /api/notes/search?q=...&min_similarity=0.78&collection_id=...
// Must be registered before /:id so the literal "search" segment isn't captured as an id.
router.get("/search", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const q = String(req.query.q || "").trim();
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const minSimilarity = Math.min(
    Math.max(Number(req.query.min_similarity) || 0, 0),
    0.99
  );
  const collectionId = req.query.collection_id
    ? Number(req.query.collection_id)
    : null;

  if (!q) {
    return res.status(400).json({ error: "q is required" });
  }
  if (collectionId !== null && !Number.isFinite(collectionId)) {
    return res.status(400).json({ error: "Invalid collection_id" });
  }

  const vector = await embedText(q);
  if (!vector || vector.length === 0) {
    return res.status(500).json({ error: "Embedding failed" });
  }

  const vectorStr = `[${vector.join(",")}]`;
  const client = await pgPool.connect();
  try {
    const distanceThreshold = minSimilarity > 0 ? 1 - minSimilarity : null;

    let result;
    if (collectionId) {
      result = await client.query(
        `
        SELECT DISTINCT ON (n.id)
               n.id, n.summary, n.key_insights, n.highlights, n.created_at,
               s.url, s.title, s.domain,
               (ne.embedding <=> $2::vector) AS distance
        FROM note_embeddings ne
        JOIN notes n ON n.id = ne.note_id
        JOIN sources s ON s.id = n.source_id
        JOIN collection_notes cn ON cn.note_id = n.id
        WHERE n.user_id = $1
          AND ($3::float8 IS NULL OR (ne.embedding <=> $2::vector) <= $3)
          AND cn.collection_id = $4
        ORDER BY n.id, distance ASC
        LIMIT $5
        `,
        [userId, vectorStr, distanceThreshold, collectionId, limit]
      );
    } else {
      result = await client.query(
        `
        SELECT n.id, n.summary, n.key_insights, n.highlights, n.created_at,
               s.url, s.title, s.domain,
               (ne.embedding <=> $2::vector) AS distance
        FROM note_embeddings ne
        JOIN notes n ON n.id = ne.note_id
        JOIN sources s ON s.id = n.source_id
        WHERE n.user_id = $1
          AND ($3::float8 IS NULL OR (ne.embedding <=> $2::vector) <= $3)
        ORDER BY distance ASC
        LIMIT $4
        `,
        [userId, vectorStr, distanceThreshold, limit]
      );
    }

    // Fallback: if threshold is too strict, retry without it
    if (result.rowCount === 0 && distanceThreshold !== null) {
      if (collectionId) {
        result = await client.query(
          `
          SELECT DISTINCT ON (n.id)
                 n.id, n.summary, n.key_insights, n.highlights, n.created_at,
                 s.url, s.title, s.domain,
                 (ne.embedding <=> $2::vector) AS distance
          FROM note_embeddings ne
          JOIN notes n ON n.id = ne.note_id
          JOIN sources s ON s.id = n.source_id
          JOIN collection_notes cn ON cn.note_id = n.id
          WHERE n.user_id = $1
            AND cn.collection_id = $3
          ORDER BY n.id, distance ASC
          LIMIT $4
          `,
          [userId, vectorStr, collectionId, limit]
        );
      } else {
        result = await client.query(
          `
          SELECT n.id, n.summary, n.key_insights, n.highlights, n.created_at,
                 s.url, s.title, s.domain,
                 (ne.embedding <=> $2::vector) AS distance
          FROM note_embeddings ne
          JOIN notes n ON n.id = ne.note_id
          JOIN sources s ON s.id = n.source_id
          WHERE n.user_id = $1
          ORDER BY distance ASC
          LIMIT $3
          `,
          [userId, vectorStr, limit]
        );
      }
    }
    res.setHeader("Cache-Control", "no-store");
    return res.json({ results: result.rows });
  } catch (err: any) {
    console.error("NOTES SEARCH ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// GET /api/notes/:id
router.get("/:id", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const noteId = Number(req.params.id);
  if (!Number.isFinite(noteId)) {
    return res.status(400).json({ error: "Invalid note id" });
  }

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      SELECT n.id, n.summary, n.key_insights, n.highlights, n.created_at,
             s.url, s.title, s.domain
      FROM notes n
      JOIN sources s ON s.id = n.source_id
      WHERE n.user_id = $1 AND n.id = $2
      `,
      [userId, noteId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    return res.json({ note: result.rows[0] });
  } catch (err: any) {
    console.error("NOTE GET ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// POST /api/notes/:id/like
router.post("/:id/like", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const noteId = Number(req.params.id);
  if (!Number.isFinite(noteId)) {
    return res.status(400).json({ error: "Invalid note id" });
  }

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      INSERT INTO note_likes (user_id, note_id)
      SELECT $1, $2
      WHERE EXISTS (
        SELECT 1 FROM notes n WHERE n.id = $2 AND n.user_id = $1
      )
      ON CONFLICT DO NOTHING
      RETURNING user_id, note_id
      `,
      [userId, noteId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("NOTE LIKE ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/notes/:id/like
router.delete("/:id/like", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const noteId = Number(req.params.id);
  if (!Number.isFinite(noteId)) {
    return res.status(400).json({ error: "Invalid note id" });
  }

  const client = await pgPool.connect();
  try {
    await client.query(
      `
      DELETE FROM note_likes
      WHERE user_id = $1 AND note_id = $2
      `,
      [userId, noteId]
    );
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("NOTE UNLIKE ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/notes/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const noteId = Number(req.params.id);
  if (!Number.isFinite(noteId)) {
    return res.status(400).json({ error: "Invalid note id" });
  }

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      DELETE FROM notes
      WHERE id = $1 AND user_id = $2
      `,
      [noteId, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("NOTE DELETE ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
