import { Router } from "express";
import { pgPool } from "../dbpg";
import { hashPassword, signToken, verifyPassword } from "../services/auth";
import { requireAuth } from "../middleware/auth";

const router = Router();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body || {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password, and name required" });
  }

  const client = await pgPool.connect();
  try {
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await hashPassword(password);

    const result = await client.query(
      `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name
      `,
      [normalizedEmail, passwordHash, name]
    );

    const user = result.rows[0];
    const token = signToken(user);
    return res.json({ token, user });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error("REGISTER ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  const client = await pgPool.connect();
  try {
    const normalizedEmail = normalizeEmail(email);
    const result = await client.query(
      `
      SELECT id, email, name, password_hash
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userRow = result.rows[0];
    const ok = await verifyPassword(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = { id: userRow.id, email: userRow.email, name: userRow.name };
    const token = signToken(user);
    return res.json({ token, user });
  } catch (err: any) {
    console.error("LOGIN ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as unknown as { user: { id: number; email: string; name: string } }).user;
  return res.json({ user });
});

export default router;
