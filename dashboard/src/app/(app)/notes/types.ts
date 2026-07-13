import type { Note } from "@/lib/types";

export type SimilarRef = { id: number; score: number };

export type NoteWithMeta = Note & {
  read_count: number;
  cluster: string;
  similar_ids: SimilarRef[];
};

export type SortKey = "date_saved" | "az" | "liked";
export type ViewMode = "list" | "grid" | "clusters";

export const SORT_LABELS: Record<SortKey, string> = {
  date_saved: "Date saved",
  az: "A–Z",
  liked: "Liked first",
};

export const CLUSTER_DESCRIPTIONS: Record<string, string> = {
  "LLM Inference": "Draft-then-verify decoding, attention kernels, and serving throughput",
  "Vector Databases": "Approximate nearest-neighbor search, index types, and embedding storage",
  "Systems Design": "Replication, consensus, hot partitions, and large-scale storage architecture",
  Rust: "Ownership model, async runtimes, and systems programming",
};
