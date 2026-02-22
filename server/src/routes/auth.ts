import { Router } from "express";
import { pgPool } from "../dbpg";
import { hashPassword, signToken, verifyPassword } from "../services/auth";
import { requireAuth } from "../middleware/auth";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { sendResetEmail } from "../services/mailer";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) =>
    String((req as any).body?.email || req.ip),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidName(name: string) {
  return name.trim().length >= 2;
}

function isStrongPassword(password: string) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~])[A-Za-z\d!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]{8,}$/.test(
    password
  );
}

router.post("/register", authLimiter, async (req, res) => {
  const { email, password, name } = req.body || {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password, and name required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  if (!isValidName(name)) {
    return res.status(400).json({ error: "Name must be at least 2 characters" });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      error:
        "Password must be at least 8 characters, include 1 uppercase letter, 1 number, and 1 special character",
    });
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

router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
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

// POST /api/auth/forgot { email }
router.post("/forgot", authLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "email required" });
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const client = await pgPool.connect();
  try {
    const normalizedEmail = normalizeEmail(email);
    const userRes = await client.query(
      `SELECT id, email FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (userRes.rowCount === 0) {
      return res.json({ ok: true });
    }

    const userId = userRes.rows[0].id as number;
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await client.query(
      `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, now() + interval '1 hour')
      `,
      [userId, tokenHash]
    );

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendResetEmail(normalizedEmail, resetUrl);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("FORGOT ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// POST /api/auth/reset { token, new_password }
router.post("/reset", authLimiter, async (req, res) => {
  const { token, new_password } = req.body || {};
  if (!token || !new_password) {
    return res.status(400).json({ error: "token and new_password required" });
  }
  if (!isStrongPassword(new_password)) {
    return res.status(400).json({
      error:
        "Password must be at least 8 characters, include 1 uppercase letter, 1 number, and 1 special character",
    });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const client = await pgPool.connect();
  try {
    const tokenRes = await client.query(
      `
      SELECT id, user_id
      FROM password_reset_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [tokenHash]
    );

    if (tokenRes.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const userId = tokenRes.rows[0].user_id as number;
    const passwordHash = await hashPassword(new_password);

    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      userId,
    ]);

    await client.query(
      `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
      [tokenRes.rows[0].id]
    );

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("RESET ERROR:", err?.message || err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
