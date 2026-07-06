/// <reference path="./express.d.ts" />
import "./env";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import notesRouter from "./routes/notes";
import authRouter from "./routes/auth";
import analyticsRouter from "./routes/analytics";
import collectionsRouter from "./routes/collections";
import sourcesRouter from "./routes/sources";
import askRouter from "./routes/ask";
import { createHeavyAiRouter } from "./routes/heavyAi";
import recallRouter from "./routes/recall";
import jobsRouter from "./routes/jobs";
import qaRouter from "./routes/qa";

const app = express();

// Allowlist of web origins permitted to call the API. The browser extension
// (chrome-extension://) and non-browser clients (no Origin header) are always
// allowed; everything else must be listed in ALLOWED_ORIGINS.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (
      !origin ||
      origin.startsWith("chrome-extension://") ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(morgan("combined"));
app.use(express.json({ limit: "2mb" }));

// Don't let a stuck upstream (DB/OpenAI) hold a request open forever.
app.use((req, _res, next) => {
  req.setTimeout(30_000);
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/notes", notesRouter);
app.use("/api/collections", collectionsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/ask", askRouter);
app.use("/api/digest", createHeavyAiRouter({ jobName: "digest", cachePrefix: "digest:weekly", path: "/weekly" }));
app.use("/api/graph", createHeavyAiRouter({ jobName: "graph", cachePrefix: "graph" }));
app.use("/api/recommendations", createHeavyAiRouter({ jobName: "recommendations", cachePrefix: "recommendations" }));
app.use("/api/contradictions", createHeavyAiRouter({ jobName: "contradictions", cachePrefix: "contradictions" }));
app.use("/api/recall", recallRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/qa", qaRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Semantic Web Intelligence Platform server listening on port ${PORT}`);
});
