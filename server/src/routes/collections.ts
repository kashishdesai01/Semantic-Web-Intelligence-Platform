import { Router } from "express";
import { pgPool } from "../dbpg";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      SELECT id, name, created_at
      FROM collections
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );
    return res.json({ collections: result.rows });
  } catch (err: any) {
    console.error("COLLECTIONS LIST ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.post("/", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      INSERT INTO collections (user_id, name)
      VALUES ($1, $2)
      RETURNING id, name, created_at
      `,
      [userId, name]
    );
    return res.json({ collection: result.rows[0] });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Collection name already exists" });
    }
    console.error("COLLECTION CREATE ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.get("/:id/notes", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const collectionId = Number(req.params.id);
  if (!Number.isFinite(collectionId)) {
    return res.status(400).json({ error: "Invalid collection id" });
  }

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      SELECT n.id, n.summary, n.key_insights, n.created_at,
             s.url, s.title, s.domain
      FROM collection_notes cn
      JOIN notes n ON n.id = cn.note_id
      JOIN sources s ON s.id = n.source_id
      WHERE cn.collection_id = $1
        AND n.user_id = $2
      ORDER BY cn.created_at DESC
      `,
      [collectionId, userId]
    );
    return res.json({ notes: result.rows });
  } catch (err: any) {
    console.error("COLLECTION NOTES LIST ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.post("/:id/notes", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const collectionId = Number(req.params.id);
  const { note_id } = req.body || {};
  if (!Number.isFinite(collectionId) || !note_id) {
    return res.status(400).json({ error: "collection id and note_id required" });
  }

  const client = await pgPool.connect();
  try {
    const collectionCheck = await client.query(
      `SELECT 1 FROM collections WHERE id = $1 AND user_id = $2`,
      [collectionId, userId]
    );
    const noteCheck = await client.query(
      `SELECT 1 FROM notes WHERE id = $1 AND user_id = $2`,
      [note_id, userId]
    );

    if (collectionCheck.rowCount === 0 || noteCheck.rowCount === 0) {
      return res.status(404).json({ error: "Collection or note not found" });
    }

    await client.query(
      `
      INSERT INTO collection_notes (collection_id, note_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [collectionId, note_id]
    );

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("COLLECTION ADD NOTE ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.delete("/:id/notes/:noteId", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const collectionId = Number(req.params.id);
  const noteId = Number(req.params.noteId);
  if (!Number.isFinite(collectionId) || !Number.isFinite(noteId)) {
    return res.status(400).json({ error: "Invalid collection or note id" });
  }

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      DELETE FROM collection_notes cn
      USING collections c, notes n
      WHERE cn.collection_id = c.id
        AND cn.note_id = n.id
        AND c.id = $1
        AND n.id = $2
        AND c.user_id = $3
        AND n.user_id = $3
      `,
      [collectionId, noteId, userId]
    );

    return res.json({ ok: true, deleted: result.rowCount });
  } catch (err: any) {
    console.error("COLLECTION REMOVE NOTE ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const collectionId = Number(req.params.id);
  if (!Number.isFinite(collectionId)) {
    return res.status(400).json({ error: "Invalid collection id" });
  }

  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      DELETE FROM collections
      WHERE id = $1 AND user_id = $2
      `,
      [collectionId, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Collection not found" });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("COLLECTION DELETE ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
