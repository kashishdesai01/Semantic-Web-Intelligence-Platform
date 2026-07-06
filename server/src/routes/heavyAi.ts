import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiQueue, cacheGet, consumeDailyBudget } from "../queue";
import rateLimit from "express-rate-limit";
import { pgPool } from "../dbpg";

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => String(req.user?.id || req.ip),
});

type HeavyJobConfig = {
  jobName: string;
  cachePrefix: string;
  path?: string;
};

export function createHeavyAiRouter(config: HeavyJobConfig): Router {
  const router = Router();

  router.get(config.path || "/", requireAuth, limiter, async (req, res) => {
    const userId = req.user!.id;
    const budgetKey = `budget:heavy:${userId}`;
    const budget = await consumeDailyBudget(
      budgetKey,
      Number(process.env.DAILY_HEAVY_LIMIT || 10)
    );
    if (!budget.ok) {
      return res.status(429).json({ error: "Daily heavy AI limit reached" });
    }

    const cacheKey = `${config.cachePrefix}:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const job = await aiQueue.add(
      config.jobName,
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
        [String(job.id), userId, config.jobName]
      );
    } finally {
      client.release();
    }

    return res.json({ status: "queued", job_id: job.id });
  });

  return router;
}
