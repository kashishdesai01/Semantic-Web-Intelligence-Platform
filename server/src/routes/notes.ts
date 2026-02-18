// import { Router } from "express";
// import { summarizeContent } from "../services/llm";
// import { db } from "../db";

// const router = Router();

// router.post("/summarize", async (req, res) => {
//   try {
//     const { title, url, content } = req.body;
//     if (!content) return res.status(400).json({ error: "content is required" });

//     const result = await summarizeContent({ title, url, content });
//     res.json(result);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// // POST /api/notes/save
// router.post("/save", async (req, res) => {
//   try {
//     const { title, url, summary, key_insights } = req.body;

//     if (!url || !summary) {
//       return res.status(400).json({ error: "url and summary are required" });
//     }

//     const domain = (() => {
//       try {
//         return new URL(url).hostname;
//       } catch {
//         return null;
//       }
//     })();

//     const insertSource = db.prepare(`
//       INSERT INTO sources (url, title, domain)
//       VALUES (?, ?, ?)
//       ON CONFLICT(url) DO UPDATE SET title=excluded.title
//     `);

//     insertSource.run(url, title || null, domain);

//     const sourceRow = db
//       .prepare(`SELECT id FROM sources WHERE url = ?`)
//       .get(url) as { id: number };

//     const insertNote = db.prepare(`
//       INSERT INTO notes (source_id, summary, key_insights)
//       VALUES (?, ?, ?)
//     `);

//     const result = insertNote.run(
//       sourceRow.id,
//       summary,
//       JSON.stringify(key_insights || [])
//     );

//     res.json({ ok: true, note_id: result.lastInsertRowid });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// export default router;

import { Router } from "express";
import { summarizeContent } from "../services/llm";
import { embedText } from "../services/embeddings";
import { pgPool } from "../dbpg";
import { requireAuth } from "../middleware/auth";

const router = Router();

// POST /api/notes/summarize
router.post("/summarize", async (req, res) => {
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
    const user = (req as unknown as { user: { id: number } }).user;
    const { title, url, summary, key_insights } = req.body;

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
      INSERT INTO notes (user_id, source_id, summary, key_insights)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING id
      `,
      [user.id, sourceId, summary, JSON.stringify(key_insights || [])]
    );

    const noteId = insertNote.rows[0].id as number;

    // Best-effort embeddings: don't fail the request if embedding fails
    try {
      const embedInput = [
        `Summary: ${summary}`,
        `Key insights: ${(key_insights || []).join(" | ")}`,
        `Title: ${title || ""}`,
        `URL: ${url}`,
      ]
        .filter(Boolean)
        .join("\n");

      const vector = await embedText(embedInput);
      if (vector && vector.length > 0) {
        const vectorStr = `[${vector.join(",")}]`;
        await client.query(
          `
          INSERT INTO note_embeddings (note_id, embedding)
          VALUES ($1, $2::vector)
          ON CONFLICT (note_id)
          DO UPDATE SET embedding = EXCLUDED.embedding, created_at = now()
          `,
          [noteId, vectorStr]
        );
      }
    } catch (embedErr: any) {
      console.warn("Embedding failed:", embedErr?.message || embedErr);
    }

    await client.query("COMMIT");
    res.json({ ok: true, note_id: noteId });
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    console.error("SAVE ERROR:", err?.message || err);
    if (err?.stack) console.error(err.stack);

    // Return the message temporarily for debugging (remove later)
    res.status(500).json({ error: err?.message || "Internal server error" });
    //   } catch (err) {
    //     await client.query("ROLLBACK");
    //     console.error(err);
    //     res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// GET /api/notes?limit=50
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      SELECT n.id, n.summary, n.key_insights, n.created_at,
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
router.get("/search", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
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
               n.id, n.summary, n.key_insights, n.created_at,
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
        SELECT n.id, n.summary, n.key_insights, n.created_at,
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
                 n.id, n.summary, n.key_insights, n.created_at,
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
          SELECT n.id, n.summary, n.key_insights, n.created_at,
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

// POST /api/notes/:id/like
router.post("/:id/like", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
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
  const userId = (req as unknown as { user: { id: number } }).user.id;
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
  const userId = (req as unknown as { user: { id: number } }).user.id;
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
