import "./env";
import { Worker } from "bullmq";
import { cacheSet } from "./queue";
import {
  buildContradictions,
  buildGraph,
  buildRecommendations,
  buildWeeklyDigest,
} from "./jobs/aiJobs";
import { embedText } from "./services/embeddings";
import { pgPool } from "./dbpg";

// Job types tracked in the ai_jobs table (heavy AI features the dashboard
// polls). Lightweight jobs like embed-note are not tracked there.
const TRACKED_JOBS = new Set(["digest", "graph", "recommendations", "contradictions"]);

const connection = { url: process.env.REDIS_URL || "redis://localhost:6379" };

type JobPayload = {
  userId: number;
  cacheKey: string;
};

type EmbedNotePayload = {
  noteId: number;
  embedInput: string;
};

async function embedNote(payload: EmbedNotePayload) {
  const vector = await embedText(payload.embedInput);
  if (!vector || vector.length === 0) return;

  const vectorStr = `[${vector.join(",")}]`;
  const client = await pgPool.connect();
  try {
    await client.query(
      `
      INSERT INTO note_embeddings (note_id, embedding)
      VALUES ($1, $2::vector)
      ON CONFLICT (note_id)
      DO UPDATE SET embedding = EXCLUDED.embedding, created_at = now()
      `,
      [payload.noteId, vectorStr]
    );
  } finally {
    client.release();
  }
}

const worker = new Worker(
  "ai-jobs",
  async (job) => {
    if (job.name === "embed-note") {
      return embedNote(job.data as EmbedNotePayload);
    }

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
  if (!job || !TRACKED_JOBS.has(job.name)) return;
  try {
    await updateJob(job.id as any, "failed", null, err?.message || String(err));
  } catch (e) {
    console.error("Failed to record job failure:", e);
  }
});

// Don't let an unexpected async error silently kill the worker process.
process.on("unhandledRejection", (reason) => {
  console.error("Worker unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Worker uncaughtException:", err);
  process.exit(1);
});

console.log("AI worker started.");
