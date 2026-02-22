import "./env";
import { Worker } from "bullmq";
import { cacheSet } from "./queue";
import {
  buildContradictions,
  buildGraph,
  buildRecommendations,
  buildWeeklyDigest,
} from "./jobs/aiJobs";
import { pgPool } from "./dbpg";

const connection = { url: process.env.REDIS_URL || "redis://localhost:6379" };

type JobPayload = {
  userId: number;
  cacheKey: string;
};

const worker = new Worker(
  "ai-jobs",
  async (job) => {
    const payload = job.data as JobPayload;
    let result: any;

    switch (job.name) {
      case "digest":
        result = await buildWeeklyDigest(payload.userId);
        await cacheSet(payload.cacheKey, result, 6 * 60 * 60);
        await updateJob(job.id!, "completed", result);
        return result;
      case "graph":
        result = await buildGraph(payload.userId);
        await cacheSet(payload.cacheKey, result, 12 * 60 * 60);
        await updateJob(job.id!, "completed", result);
        return result;
      case "recommendations":
        result = await buildRecommendations(payload.userId);
        await cacheSet(payload.cacheKey, result, 6 * 60 * 60);
        await updateJob(job.id!, "completed", result);
        return result;
      case "contradictions":
        result = await buildContradictions(payload.userId);
        await cacheSet(payload.cacheKey, result, 6 * 60 * 60);
        await updateJob(job.id!, "completed", result);
        return result;
      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  },
  { connection }
);

async function updateJob(jobId: string | number, status: string, result?: any, error?: string) {
  const client = await pgPool.connect();
  try {
    await client.query(
      `
      UPDATE ai_jobs
      SET status = $2, result = $3::jsonb, error = $4, updated_at = now()
      WHERE id = $1
      `,
      [String(jobId), status, result ? JSON.stringify(result) : null, error || null]
    );
  } finally {
    client.release();
  }
}

worker.on("failed", async (job, err) => {
  try {
    await updateJob(job?.id as any, "failed", null, err?.message || String(err));
  } catch {}
});

console.log("AI worker started.");
