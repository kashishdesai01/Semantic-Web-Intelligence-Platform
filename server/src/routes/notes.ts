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
import { pgPool } from "../dbpg";

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
router.post("/save", async (req, res) => {
  const client = await pgPool.connect();
  try {
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
      INSERT INTO sources (url, title, domain)
      VALUES ($1, $2, $3)
      ON CONFLICT (url)
      DO UPDATE SET title = EXCLUDED.title, domain = EXCLUDED.domain
      RETURNING id
      `,
      [url, title || null, domain]
    );

    const sourceId = upsertSource.rows[0].id as number;

    // Insert note
    const insertNote = await client.query(
      `
      INSERT INTO notes (source_id, summary, key_insights)
      VALUES ($1, $2, $3::jsonb)
      RETURNING id
      `,
      [sourceId, summary, JSON.stringify(key_insights || [])]
    );

    const noteId = insertNote.rows[0].id as number;

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

export default router;
