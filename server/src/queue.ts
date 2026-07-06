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
  // Atomic INCR + EXPIRE via Lua to prevent a crash between the two commands
  // from permanently stranding the key without a TTL.
  const current = (await redis.eval(
    `local v = redis.call("INCR", KEYS[1])
     if v == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
     return v`,
    1,
    key,
    String(24 * 60 * 60)
  )) as number;
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
