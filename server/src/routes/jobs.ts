import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiQueue } from "../queue";
import { pgPool } from "../dbpg";

const router = Router();

// GET /api/jobs/:id
router.get("/:id", requireAuth, async (req, res) => {
  const jobId = req.params.id;
  const job = await aiQueue.getJob(jobId);
  if (!job) {
    const client = await pgPool.connect();
    try {
      const result = await client.query(
        `
        SELECT status, result, error
        FROM ai_jobs
        WHERE id = $1
        `,
        [String(jobId)]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Job not found" });
      }
      const row = result.rows[0];
      if (row.status === "completed") {
        return res.json({ status: "completed", result: row.result });
      }
      if (row.status === "failed") {
        return res.json({ status: "failed", error: row.error });
      }
      return res.json({ status: row.status });
    } finally {
      client.release();
    }
  }

  const state = await job.getState();
  if (state === "completed") {
    return res.json({ status: "completed", result: await job.returnvalue });
  }
  if (state === "failed") {
    return res.json({ status: "failed", error: job.failedReason });
  }
  return res.json({ status: state });
});

export default router;
