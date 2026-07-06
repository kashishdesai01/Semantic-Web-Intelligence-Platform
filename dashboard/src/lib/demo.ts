import type { Collection, Note, Totals } from "@/lib/types";
import type { ScoredSource } from "@/components/dashboard/SourceCard";

/**
 * Plausible mock data for the fully-populated dashboard variant (enabled with
 * ?demo=1). Real-looking URLs, relevance scores, and saved-article summaries so
 * the design can be reviewed without a seeded account.
 */

export const DEMO_TOTALS: Totals = {
  total_notes: 342,
  total_sources: 168,
};

// Small weekly series for the stat sparklines (muted, non-accent).
export const DEMO_SERIES = {
  notes: [280, 291, 298, 310, 318, 331, 342],
  sources: [150, 152, 155, 159, 161, 165, 168],
  collections: [6, 6, 7, 7, 8, 8, 9],
};

export const DEMO_COLLECTIONS: Collection[] = [
  { id: 1, name: "LLM Inference", created_at: "2026-06-02T10:00:00Z" },
  { id: 2, name: "Systems Design", created_at: "2026-05-21T10:00:00Z" },
  { id: 3, name: "Vector Databases", created_at: "2026-05-14T10:00:00Z" },
  { id: 4, name: "Papers to Reread", created_at: "2026-04-30T10:00:00Z" },
  { id: 5, name: "Rust", created_at: "2026-04-11T10:00:00Z" },
  { id: 6, name: "Startups", created_at: "2026-03-28T10:00:00Z" },
];

export const DEMO_NOTES: Note[] = [
  {
    id: 101,
    title: "Fast Inference from Transformers via Speculative Decoding",
    url: "https://arxiv.org/abs/2211.17192",
    domain: "arxiv.org",
    created_at: "2026-07-04T14:12:00Z",
    summary:
      "Introduces speculative decoding: a small draft model proposes several tokens that the large target model verifies in a single forward pass, yielding 2–3× wall-clock speedups with no change to the output distribution.",
    key_insights: [
      "Draft-then-verify keeps the target model's exact sampling distribution.",
      "Speedup scales with draft acceptance rate, not raw draft speed.",
    ],
    liked: true,
  },
  {
    id: 102,
    title: "Designing Data-Intensive Applications — Ch. 5: Replication",
    url: "https://dataintensive.net/",
    domain: "dataintensive.net",
    created_at: "2026-07-03T09:40:00Z",
    summary:
      "Leader-based, multi-leader, and leaderless replication compared through the lens of consistency, latency, and failover. Quorum reads/writes trade availability against staleness.",
    key_insights: ["Read-your-writes needs sticky routing or version tracking."],
  },
  {
    id: 103,
    title: "pgvector: Storing and querying embeddings in Postgres",
    url: "https://github.com/pgvector/pgvector",
    domain: "github.com",
    created_at: "2026-07-01T18:05:00Z",
    summary:
      "HNSW and IVFFlat index types for approximate nearest-neighbour search directly in Postgres, with cosine / L2 / inner-product operators and tunable recall.",
    key_insights: ["HNSW gives better recall at query time; IVFFlat builds faster."],
    liked: true,
  },
  {
    id: 104,
    title: "The Rust Programming Language — Ownership",
    url: "https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html",
    domain: "doc.rust-lang.org",
    created_at: "2026-06-29T21:22:00Z",
    summary:
      "Ownership, borrowing, and lifetimes give memory safety without a garbage collector by enforcing a single owner and compile-time borrow checking.",
    key_insights: [],
  },
  {
    id: 105,
    title: "How Discord stores trillions of messages",
    url: "https://discord.com/blog/how-discord-stores-trillions-of-messages",
    domain: "discord.com",
    created_at: "2026-06-27T12:00:00Z",
    summary:
      "Migration from Cassandra to ScyllaDB plus a Rust data-services layer to tame tail latencies and hot partitions at trillions of rows.",
    key_insights: ["A request-coalescing layer collapsed hot-partition stampedes."],
  },
];

export const DEMO_QUERY = "How does speculative decoding speed up LLM inference?";

export const DEMO_SOURCES: ScoredSource[] = [
  {
    id: 101,
    index: 1,
    title: "Fast Inference from Transformers via Speculative Decoding",
    url: "https://arxiv.org/abs/2211.17192",
    domain: "arxiv.org",
    score: 0.94,
    snippet:
      "A small, fast draft model generates a chunk of candidate tokens which the large target model verifies in one parallel forward pass. Accepted tokens are kept; the first rejection resamples from the target — so the output matches the target's own distribution exactly.",
    insights: [
      "Verification is a single batched forward pass over the draft tokens.",
      "No retraining or distillation of the target model is required.",
    ],
    saved: true,
  },
  {
    id: 201,
    index: 2,
    title: "Accelerating Large Language Model Decoding with Speculative Sampling",
    url: "https://deepmind.google/research/publications/speculative-sampling/",
    domain: "deepmind.google",
    score: 0.91,
    snippet:
      "DeepMind's speculative sampling reports 2–2.5× decoding speedups on Chinchilla with a modified rejection scheme that provably preserves the target model's sampling distribution.",
    insights: ["The acceptance test is the key to unbiased sampling."],
  },
  {
    id: 202,
    index: 3,
    title: "How Speculative Decoding Works in vLLM",
    url: "https://blog.vllm.ai/2024/10/17/spec-decode.html",
    domain: "blog.vllm.ai",
    score: 0.88,
    snippet:
      "Practical notes on integrating draft models, n-gram proposers, and Medusa heads into a production server, plus why acceptance rate — not draft latency — dominates realized throughput.",
    insights: [
      "Batching erodes speculative gains as the batch fills the GPU.",
      "n-gram / prompt-lookup drafting needs no second model at all.",
    ],
  },
  {
    id: 203,
    index: 4,
    title: "Medusa: Simple LLM Inference Acceleration with Multiple Decoding Heads",
    url: "https://arxiv.org/abs/2401.10774",
    domain: "arxiv.org",
    score: 0.83,
    snippet:
      "Instead of a separate draft model, Medusa adds extra decoding heads that predict several future tokens in parallel, then verifies them with a tree-based attention mask.",
    insights: ["Tree attention verifies many candidate continuations at once."],
  },
];

export const DEMO_DIGEST = {
  summary:
    "This week leaned heavily on LLM serving performance — speculative decoding, batching trade-offs, and KV-cache management — alongside a thread on database replication and storage at scale.",
  themes: [
    {
      title: "Faster LLM inference",
      summary:
        "Draft-then-verify decoding and multi-head prediction recur as the highest-leverage latency wins for small-batch serving.",
      note_ids: [101],
    },
    {
      title: "Storage at scale",
      summary:
        "Replication strategy and hot-partition mitigation showed up across the DDIA notes and the Discord/ScyllaDB write-up.",
      note_ids: [102, 105],
    },
  ],
};

export const DEMO_ANSWER =
  "Speculative decoding accelerates autoregressive generation by replacing one-token-at-a-time decoding with a draft-then-verify loop. A small, cheap draft model proposes several candidate tokens, and the large target model verifies all of them in a single parallel forward pass [1][2]. Because verification uses a rejection test that resamples on the first mismatch, the emitted tokens are provably drawn from the target model's own distribution — the speedup is exact, not approximate [2]. Realized throughput is governed by the acceptance rate rather than raw draft speed, so most engineering effort goes into better proposers: lightweight draft models, n-gram / prompt-lookup, or extra decoding heads as in Medusa [3][4]. Gains shrink as batch size grows and the GPU saturates, which is why speculative decoding helps most in low-latency, small-batch serving [3].";
