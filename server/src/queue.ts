import { Queue } from "bullmq";
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl);

export const aiQueue = new Queue("ai-jobs", {
  connection: { url: redisUrl },
});

export async function consumeDailyBudget(
  key: string,
  limit: number
): Promise<{ ok: boolean; remaining: number }> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 24 * 60 * 60);
  }
  const remaining = Math.max(limit - current, 0);
  return { ok: current <= limit, remaining };
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}
