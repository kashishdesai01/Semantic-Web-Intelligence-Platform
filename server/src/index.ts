import "./env";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import notesRouter from "./routes/notes";
import authRouter from "./routes/auth";
import analyticsRouter from "./routes/analytics";
import collectionsRouter from "./routes/collections";
import sourcesRouter from "./routes/sources";

dotenv.config();

const app = express();

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/notes", notesRouter);
app.use("/api/collections", collectionsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/sources", sourcesRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`InsightLens server listening on port ${PORT}`);
});
