import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiQueue, cacheGet, consumeDailyBudget } from "../queue";
import rateLimit from "express-rate-limit";
import { pgPool } from "../dbpg";

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) =>
    String((req as any).user?.id || req.ip),
});

// GET /api/graph
router.get("/", requireAuth, limiter, async (req, res) => {
  const userId = (req as unknown as { user: { id: number } }).user.id;
  const budgetKey = `budget:heavy:${userId}`;
  const budget = await consumeDailyBudget(
    budgetKey,
    Number(process.env.DAILY_HEAVY_LIMIT || 10)
  );
  if (!budget.ok) {
    return res.status(429).json({ error: "Daily heavy AI limit reached" });
  }

  const cacheKey = `graph:${userId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const job = await aiQueue.add(
    "graph",
    { userId, cacheKey },
    {
      removeOnComplete: 50,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: "exponential", delay: 30000 },
    }
  );

  const client = await pgPool.connect();
  try {
    await client.query(
      `
      INSERT INTO ai_jobs (id, user_id, type, status)
      VALUES ($1, $2, $3, 'queued')
      `,
      [String(job.id), userId, "graph"]
    );
  } finally {
    client.release();
  }

  return res.json({ status: "queued", job_id: job.id });
});

export default router;
