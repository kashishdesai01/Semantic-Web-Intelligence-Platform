import "./env";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import notesRouter from "./routes/notes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/notes", notesRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`InsightLens server listening on port ${PORT}`);
});
