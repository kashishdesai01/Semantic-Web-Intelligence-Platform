import "./env";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import notesRouter from "./routes/notes";
import authRouter from "./routes/auth";
import analyticsRouter from "./routes/analytics";
import collectionsRouter from "./routes/collections";
import sourcesRouter from "./routes/sources";
import askRouter from "./routes/ask";
import digestRouter from "./routes/digest";
import graphRouter from "./routes/graph";
import recommendationsRouter from "./routes/recommendations";
import contradictionsRouter from "./routes/contradictions";
import recallRouter from "./routes/recall";
import jobsRouter from "./routes/jobs";
import qaRouter from "./routes/qa";

dotenv.config();

const app = express();

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(morgan("combined"));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/notes", notesRouter);
app.use("/api/collections", collectionsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/ask", askRouter);
app.use("/api/digest", digestRouter);
app.use("/api/graph", graphRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/contradictions", contradictionsRouter);
app.use("/api/recall", recallRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/qa", qaRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`InsightLens server listening on port ${PORT}`);
});
