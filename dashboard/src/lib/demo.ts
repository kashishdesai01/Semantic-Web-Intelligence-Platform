import type { Collection, Note, Totals, DigestFull, PastDigest, WeekStats, ClusterPreview } from "@/lib/types";
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

export const DEMO_WEEK_STATS: WeekStats = {
  notesThisWeek: 5,
  topicsCount: 4,
  sourceCount: 5,
};

export const DEMO_CLUSTERS: ClusterPreview[] = [
  { name: "LLM Inference", count: 3 },
  { name: "Vector Databases", count: 1 },
  { name: "Systems Design", count: 2 },
  { name: "Rust", count: 1 },
];

export const DEMO_DIGEST_FULL: DigestFull = {
  weekRange: "Jul 4–10, 2026",
  generatedAt: "2026-07-10T08:00:00Z",
  overview:
    "This week's reading centred on two interlocking themes: making large language models faster at inference time [1][2][3] and managing data at scale in distributed systems [4][5]. The speculative decoding thread connects draft-model acceptance rates directly to throughput — a constraint that resurfaces in the vLLM production notes. On the storage side, the replication and hot-partition material from DDIA and Discord's ScyllaDB migration form a coherent arc about the latency penalties of strong consistency.",
  sections: [
    {
      cluster: "LLM Inference",
      noteCount: 3,
      synthesis:
        "Three papers converge on the same insight: the bottleneck in autoregressive decoding is the sequential per-token forward pass, and the fastest practical mitigation is to amortise that cost over several candidate tokens verified in parallel. Acceptance rate, not draft speed, determines real-world gains.",
      notes: [
        {
          id: 101,
          title: "Fast Inference from Transformers via Speculative Decoding",
          url: "https://arxiv.org/abs/2211.17192",
          domain: "arxiv.org",
          snippet:
            "Draft-then-verify reduces sequential forward passes 2–3× with no change to output distribution.",
          relevance: 0.94,
        },
        {
          id: 201,
          title: "Accelerating Large Language Model Decoding with Speculative Sampling",
          url: "https://deepmind.google/research/publications/speculative-sampling/",
          domain: "deepmind.google",
          snippet:
            "Chinchilla gains 2–2.5× via a modified rejection scheme that provably preserves the target distribution.",
          relevance: 0.91,
        },
        {
          id: 202,
          title: "How Speculative Decoding Works in vLLM",
          url: "https://blog.vllm.ai/2024/10/17/spec-decode.html",
          domain: "blog.vllm.ai",
          snippet:
            "Production notes on draft models, n-gram proposers, and Medusa heads; gains shrink at high batch sizes.",
          relevance: 0.88,
        },
      ],
    },
    {
      cluster: "Vector Databases",
      noteCount: 1,
      synthesis:
        "A single but foundational note on pgvector's HNSW and IVFFlat index types. The key trade-off (build time vs. recall) resurfaces as a design constraint whenever embedding-based retrieval must scale beyond a single Postgres instance.",
      notes: [
        {
          id: 103,
          title: "pgvector: Storing and querying embeddings in Postgres",
          url: "https://github.com/pgvector/pgvector",
          domain: "github.com",
          snippet:
            "HNSW gives better recall at query time; IVFFlat builds faster. Cosine, L2, and inner-product operators.",
          relevance: 0.82,
        },
      ],
    },
    {
      cluster: "Systems Design",
      noteCount: 2,
      synthesis:
        "The DDIA replication chapter and Discord's ScyllaDB write-up both stress that strong consistency is expensive — whether through quorum latency or hot-partition stampedes. Both recommend coalescing or routing layers as the first line of defence before touching replication topology.",
      notes: [
        {
          id: 102,
          title: "Designing Data-Intensive Applications — Ch. 5: Replication",
          url: "https://dataintensive.net/",
          domain: "dataintensive.net",
          snippet:
            "Leader-based, multi-leader, and leaderless replication compared through consistency, latency, and failover.",
          relevance: 0.79,
        },
        {
          id: 105,
          title: "How Discord stores trillions of messages",
          url: "https://discord.com/blog/how-discord-stores-trillions-of-messages",
          domain: "discord.com",
          snippet:
            "Migration from Cassandra to ScyllaDB; a request-coalescing layer collapsed hot-partition stampedes.",
          relevance: 0.76,
        },
      ],
    },
    {
      cluster: "Rust",
      noteCount: 1,
      synthesis:
        "The ownership chapter from The Rust Book provided the conceptual foundation for understanding how Discord's Rust data-services layer achieves memory safety without a GC — a thread that connects back to the Systems Design cluster.",
      notes: [
        {
          id: 104,
          title: "The Rust Programming Language — Ownership",
          url: "https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html",
          domain: "doc.rust-lang.org",
          snippet:
            "Ownership, borrowing, and lifetimes give memory safety without a GC via compile-time borrow checking.",
          relevance: 0.71,
        },
      ],
    },
  ],
};

export const DEMO_PAST_DIGESTS: PastDigest[] = [
  {
    id: "2026-W27",
    weekRange: "Jun 27 – Jul 3",
    summary: "Rust ownership deep-dives and ScyllaDB performance write-ups dominated.",
    noteCount: 11,
  },
  {
    id: "2026-W26",
    weekRange: "Jun 20–26",
    summary: "Vector database benchmarks and pgvector index tuning.",
    noteCount: 8,
  },
  {
    id: "2026-W25",
    weekRange: "Jun 13–19",
    summary: "LLM fine-tuning approaches and LoRA parameter efficiency.",
    noteCount: 14,
  },
  {
    id: "2026-W24",
    weekRange: "Jun 6–12",
    summary: "Distributed systems consistency models and consensus protocols.",
    noteCount: 9,
  },
];

export const DEMO_ANSWER =
  "Speculative decoding accelerates autoregressive generation by replacing one-token-at-a-time decoding with a draft-then-verify loop. A small, cheap draft model proposes several candidate tokens, and the large target model verifies all of them in a single parallel forward pass [1][2]. Because verification uses a rejection test that resamples on the first mismatch, the emitted tokens are provably drawn from the target model's own distribution — the speedup is exact, not approximate [2]. Realized throughput is governed by the acceptance rate rather than raw draft speed, so most engineering effort goes into better proposers: lightweight draft models, n-gram / prompt-lookup, or extra decoding heads as in Medusa [3][4]. Gains shrink as batch size grows and the GPU saturates, which is why speculative decoding helps most in low-latency, small-batch serving [3].";

// ── Analytics demo data ───────────────────────────────────────────────────────

export type AnalyticsMiniNote = {
  id: number;
  created_at: string;
  domain: string;
  cluster: "LLM Inference" | "Vector Databases" | "Systems Design" | "Rust" | "Startups";
  liked: boolean;
};

// Deterministic LCG so the dataset is stable across renders.
function makeLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateAnalyticsNotes(): AnalyticsMiniNote[] {
  const rng = makeLcg(0xdeadbeef);

  // Weighted (domain, cluster) pairs that drive the realistic skew.
  const pairs: [string, AnalyticsMiniNote["cluster"]][] = [
    ["arxiv.org",        "LLM Inference"],
    ["arxiv.org",        "LLM Inference"],
    ["arxiv.org",        "LLM Inference"],
    ["arxiv.org",        "Vector Databases"],
    ["blog.vllm.ai",     "LLM Inference"],
    ["blog.vllm.ai",     "LLM Inference"],
    ["deepmind.google",  "LLM Inference"],
    ["deepmind.google",  "Vector Databases"],
    ["github.com",       "Vector Databases"],
    ["github.com",       "Systems Design"],
    ["github.com",       "Rust"],
    ["github.com",       "Rust"],
    ["dataintensive.net","Systems Design"],
    ["dataintensive.net","Systems Design"],
    ["techcrunch.com",   "Startups"],
    ["techcrunch.com",   "Startups"],
    ["venturebeat.com",  "Startups"],
  ];

  // 2026-01-10 → 2026-07-10 (181 days).
  const START_MS = Date.UTC(2026, 0, 10);
  const END_MS   = Date.UTC(2026, 6, 10);
  const SPAN_MS  = END_MS - START_MS;

  const notes: AnalyticsMiniNote[] = [];
  for (let i = 0; i < 150; i++) {
    const [domain, cluster] = pairs[Math.floor(rng() * pairs.length)];
    // Slight recency bias: Math.pow skews the uniform distribution toward later dates.
    const offsetMs = Math.floor(Math.pow(rng(), 0.75) * SPAN_MS);
    // Sprinkle a within-day time component so per-day counts look natural.
    const dayMs = Math.floor(rng() * 86_400_000);
    const ts = new Date(START_MS + offsetMs + dayMs).toISOString();
    notes.push({ id: 300 + i, created_at: ts, domain, cluster, liked: rng() < 0.18 });
  }

  return notes.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export const DEMO_ANALYTICS_NOTES: AnalyticsMiniNote[] = generateAnalyticsNotes();

// ── Knowledge graph demo data ─────────────────────────────────────────────────

export type DemoGraphNode = {
  id: string;
  label: string;
  cluster: string;
  domain: string;
  summary: string;
};

export type DemoGraphEdge = {
  source: string;
  target: string;
  similarity: number;
};

export const DEMO_GRAPH_NODES: DemoGraphNode[] = [
  // ── LLM Inference (llm0–llm14) ──────────────────────────────────────────
  { id: "llm0",  label: "Speculative decoding",         cluster: "LLM Inference",    domain: "arxiv.org",         summary: "A small draft model proposes several tokens; the large target model verifies them in one parallel pass, yielding 2–3× speedup with no change to the output distribution." },
  { id: "llm1",  label: "Flash Attention v2",           cluster: "LLM Inference",    domain: "arxiv.org",         summary: "IO-aware attention computes softmax in tiles to avoid materialising the full N×N attention matrix, reducing memory bandwidth and enabling longer contexts." },
  { id: "llm2",  label: "AWQ quantization",             cluster: "LLM Inference",    domain: "arxiv.org",         summary: "Activation-aware Weight Quantization protects salient weights during 4-bit compression, preserving quality better than round-to-nearest at the same bit-width." },
  { id: "llm3",  label: "KV-cache compression",         cluster: "LLM Inference",    domain: "huggingface.co",    summary: "Sliding windows, grouped-query attention, and multi-query attention reduce the key-value cache footprint during inference, trading context length against memory." },
  { id: "llm4",  label: "Continuous batching",          cluster: "LLM Inference",    domain: "blog.vllm.ai",      summary: "Iteration-level scheduling inserts and removes requests mid-flight, keeping GPU utilisation near 100% regardless of sequence length variance." },
  { id: "llm5",  label: "vLLM serving architecture",    cluster: "LLM Inference",    domain: "blog.vllm.ai",      summary: "PagedAttention + continuous batching + prefix caching combine to deliver state-of-the-art throughput for LLM serving at production scale." },
  { id: "llm6",  label: "Medusa multi-head decoding",   cluster: "LLM Inference",    domain: "arxiv.org",         summary: "Extra decoding heads predict several future tokens in parallel; tree-based attention verifies many candidate continuations simultaneously, speeding autoregressive generation." },
  { id: "llm7",  label: "Eagle speculative decoding",   cluster: "LLM Inference",    domain: "arxiv.org",         summary: "Feature-level speculation: drafts using the target model's hidden states rather than a separate small model, achieving higher acceptance rates than classical speculative decoding." },
  { id: "llm8",  label: "PagedAttention",               cluster: "LLM Inference",    domain: "arxiv.org",         summary: "Virtual memory for KV caches: non-contiguous physical memory blocks managed via a page table, eliminating fragmentation and enabling fine-grained prefix sharing." },
  { id: "llm9",  label: "GGUF format",                  cluster: "LLM Inference",    domain: "github.com",        summary: "A container format for quantised LLM weights that encodes metadata, tokeniser, and architecture info so models run on CPU/GPU without external config files." },
  { id: "llm10", label: "Ollama local serving",         cluster: "LLM Inference",    domain: "ollama.ai",         summary: "Wraps GGML/GGUF models in an OpenAI-compatible REST server with automatic model download and GPU offload, making local LLM serving a one-line install." },
  { id: "llm11", label: "MoE inference efficiency",     cluster: "LLM Inference",    domain: "arxiv.org",         summary: "Sparse MoE routes each token through a subset of experts; routing bottleneck and load-balancing loss are the main engineering challenges in efficient MoE serving." },
  { id: "llm12", label: "LoRA inference",               cluster: "LLM Inference",    domain: "arxiv.org",         summary: "Low-Rank Adaptation merges a small trainable rank decomposition into frozen weights; adapters can be hot-swapped at serving time with negligible overhead." },
  { id: "llm13", label: "Prompt prefix caching",        cluster: "LLM Inference",    domain: "blog.vllm.ai",      summary: "Caching the KV states of repeated prompt prefixes amortises their compute across thousands of requests, cutting TTFT for retrieval-augmented workloads." },
  { id: "llm14", label: "DeepSeek-V3 architecture",    cluster: "LLM Inference",    domain: "deepseek.com",      summary: "Multi-head latent attention + 671B MoE with 37B active parameters; auxiliary-loss-free load balancing and FP8 training achieve GPT-4-class quality at a fraction of compute." },

  // ── Vector Databases (vdb0–vdb9) ─────────────────────────────────────────
  { id: "vdb0",  label: "pgvector HNSW",                cluster: "Vector Databases", domain: "github.com",        summary: "Hierarchical Navigable Small World index in Postgres: sub-linear ANN search with tunable ef_search and M parameters, efficient for cosine and L2 distance queries." },
  { id: "vdb1",  label: "pgvector IVFFlat",             cluster: "Vector Databases", domain: "github.com",        summary: "Inverted file index for ANN search; faster to build than HNSW but lower recall at query time — suited for batch workloads over interactive serving." },
  { id: "vdb2",  label: "Pinecone managed vectors",     cluster: "Vector Databases", domain: "pinecone.io",       summary: "Fully managed vector database with serverless tiers; handles index partitioning, replication, and metadata filtering transparently, at the cost of no on-premise option." },
  { id: "vdb3",  label: "Weaviate semantic search",     cluster: "Vector Databases", domain: "weaviate.io",       summary: "Vector DB with built-in vectorisation modules (OpenAI, Cohere, Hugging Face), hybrid BM25+vector search, and a GraphQL query API." },
  { id: "vdb4",  label: "Chroma local store",           cluster: "Vector Databases", domain: "trychroma.com",     summary: "Python-first embedding store for local RAG prototyping; supports SQLite persistence and swappable embedding functions with a minimal API." },
  { id: "vdb5",  label: "FAISS index types",            cluster: "Vector Databases", domain: "github.com",        summary: "Facebook AI Similarity Search: IVF, HNSW, PQ, and IVFPQ index variants with GPU support; the reference ANN library behind most vector databases." },
  { id: "vdb6",  label: "ANN benchmarks survey",        cluster: "Vector Databases", domain: "ann-benchmarks.com",summary: "ann-benchmarks compares index types (HNSW, IVF, Annoy, ScaNN) across recall and QPS, consistently finding HNSW at the recall-throughput frontier." },
  { id: "vdb7",  label: "Cosine vs dot-product",        cluster: "Vector Databases", domain: "huggingface.co",    summary: "Cosine similarity normalises magnitude; dot product does not. For L2-normalised embeddings the two are equivalent — unnormalised models need explicit normalisation." },
  { id: "vdb8",  label: "Embedding model selection",    cluster: "Vector Databases", domain: "huggingface.co",    summary: "MTEB benchmark results: model size, context window, and domain specialisation dominate recall; symmetric vs. asymmetric training matters for query-document pairs." },
  { id: "vdb9",  label: "RAG retrieval patterns",       cluster: "Vector Databases", domain: "arxiv.org",         summary: "RAG pipelines: chunking strategies, query rewriting, cross-encoder re-ranking, and hypothetical document embeddings (HyDE) each address distinct accuracy bottlenecks." },

  // ── Systems Design (sys0–sys11) ───────────────────────────────────────────
  { id: "sys0",  label: "Leader-follower replication",  cluster: "Systems Design",   domain: "dataintensive.net", summary: "Single write leader with read replicas; failover promotes a follower. Synchronous vs. asynchronous replication trades durability against write latency." },
  { id: "sys1",  label: "Multi-leader conflicts",       cluster: "Systems Design",   domain: "dataintensive.net", summary: "Concurrent writes to multiple leaders produce divergent histories; LWW, CRDT, and custom merge functions resolve conflicts with different consistency–usability tradeoffs." },
  { id: "sys2",  label: "Leaderless quorum reads",      cluster: "Systems Design",   domain: "dataintensive.net", summary: "Dynamo-style w+r>n quorums guarantee read-your-writes without a designated leader, at the cost of complex anti-entropy and sloppy-quorum edge cases." },
  { id: "sys3",  label: "ScyllaDB vs Cassandra",        cluster: "Systems Design",   domain: "discord.com",       summary: "ScyllaDB reimplements Cassandra's data model in C++ with seastar's async I/O, eliminating JVM GC pauses and reducing p99 tail latencies by an order of magnitude." },
  { id: "sys4",  label: "Hot partition mitigation",     cluster: "Systems Design",   domain: "discord.com",       summary: "Request coalescing, write sharding, and read-replica fan-out prevent a single partition key from bottlenecking the entire cluster under thundering-herd load." },
  { id: "sys5",  label: "LSM tree vs B-tree",           cluster: "Systems Design",   domain: "leveldb.github.io", summary: "LSM trees batch writes into memory and compact to disk, favouring write-heavy workloads; B-trees maintain sorted order on disk with fewer read amplification factors." },
  { id: "sys6",  label: "Raft consensus protocol",      cluster: "Systems Design",   domain: "raft.github.io",    summary: "Raft serialises log entries through a single elected leader, making leader election, log replication, and membership changes understandable and formally verifiable." },
  { id: "sys7",  label: "Consistent hashing",           cluster: "Systems Design",   domain: "blog.discord.com",  summary: "Consistent hashing minimises key redistribution when nodes join or leave; virtual nodes smooth load imbalance introduced by heterogeneous hardware." },
  { id: "sys8",  label: "Circuit breaker pattern",      cluster: "Systems Design",   domain: "martinfowler.com",  summary: "Wraps remote calls in a closed/open/half-open state machine to fail fast when downstream degrades, preventing cascading failures across a distributed system." },
  { id: "sys9",  label: "Event sourcing and CQRS",      cluster: "Systems Design",   domain: "martinfowler.com",  summary: "Appending domain events as the source of truth enables temporal queries and audit logs; CQRS separates write models from read projections for independent scaling." },
  { id: "sys10", label: "Cache invalidation strategies",cluster: "Systems Design",   domain: "blog.cloudflare.com",summary: "Write-through, write-behind, and cache-aside each trade consistency against complexity; TTL-based expiry is simple but event-driven invalidation requires a message bus." },
  { id: "sys11", label: "Distributed tracing",          cluster: "Systems Design",   domain: "opentelemetry.io",  summary: "Propagating trace context with OpenTelemetry allows flame-graph visualisation of end-to-end request latency and identification of cross-service bottlenecks." },

  // ── Rust (rst0–rst7) ──────────────────────────────────────────────────────
  { id: "rst0",  label: "Ownership and borrowing",      cluster: "Rust",             domain: "doc.rust-lang.org", summary: "A single owner rules; borrows are either one mutable or many immutable references at a time. The borrow checker enforces this at compile time, eliminating use-after-free." },
  { id: "rst1",  label: "Rust lifetimes",               cluster: "Rust",             domain: "doc.rust-lang.org", summary: "Lifetime annotations tell the compiler how long references are valid, enabling safe return of borrowed data from functions without GC or smart-pointer overhead." },
  { id: "rst2",  label: "Async Rust with tokio",        cluster: "Rust",             domain: "tokio.rs",          summary: "Tokio's multi-threaded work-stealing runtime wraps OS threads with green tasks, making async/.await practical for high-concurrency I/O in network services." },
  { id: "rst3",  label: "Unsafe Rust patterns",         cluster: "Rust",             domain: "doc.rust-lang.org", summary: "Unsafe blocks unlock raw pointers, FFI, and mutable statics; the pattern is encapsulating unsafe behind a safe public API that upholds invariants the compiler cannot check." },
  { id: "rst4",  label: "Zero-cost abstractions",       cluster: "Rust",             domain: "blog.rust-lang.org",summary: "Rust's monomorphisation compiles generic code into concrete types without vtables, so iterators, closures, and traits incur no runtime overhead vs. hand-written loops." },
  { id: "rst5",  label: "Cargo workspace",              cluster: "Rust",             domain: "doc.rust-lang.org", summary: "A workspace groups related crates under one Cargo.toml and lockfile, enabling incremental compilation sharing and coordinated dependency resolution across a monorepo." },
  { id: "rst6",  label: "Memory-safe data structures",  cluster: "Rust",             domain: "github.com",        summary: "Implementing linked lists, graphs, and arenas in safe Rust requires arena allocation with indices or Rc<RefCell<T>> — patterns to work around the borrow checker." },
  { id: "rst7",  label: "Rust for systems programming", cluster: "Rust",             domain: "doc.rust-lang.org", summary: "Rust's combination of memory safety, fearless concurrency, and C-compatible ABI makes it a drop-in replacement for C/C++ in kernels, embedded firmware, and high-perf servers." },

  // ── Startups (stk0–stk9) ─────────────────────────────────────────────────
  { id: "stk0",  label: "AI startup landscape 2026",    cluster: "Startups",         domain: "techcrunch.com",    summary: "The 2026 AI landscape bifurcates between foundation-model providers burning cash on compute and application-layer companies finding margins in vertical specialisation." },
  { id: "stk1",  label: "Foundation model moats",       cluster: "Startups",         domain: "a16z.com",          summary: "Moats in foundation models are narrowing: open weights, distillation, and fine-tuning commoditise capabilities; defensible value shifts to data flywheels and distribution." },
  { id: "stk2",  label: "Series A climate 2026",        cluster: "Startups",         domain: "blog.ycombinator.com",summary: "2026 Series A rounds are larger but slower; investors demand demonstrated retention and payback periods under 18 months; AI-native revenue multiples compress toward SaaS." },
  { id: "stk3",  label: "Developer tools category",     cluster: "Startups",         domain: "blog.ycombinator.com",summary: "LLM-powered developer tools (code review, test generation, docs) show the fastest enterprise adoption; multi-agent frameworks are the next frontier with pricing still in flux." },
  { id: "stk4",  label: "Open source business models",  cluster: "Startups",         domain: "a16z.com",          summary: "Open-weight models create adoption flywheels but require monetisation via managed hosting, enterprise support, or feature gating — the Red Hat parallel resurfaces in every pitch." },
  { id: "stk5",  label: "GPU cloud pricing wars",       cluster: "Startups",         domain: "semianalysis.com",  summary: "H100 spot prices fell 40% in H1 2026 as new entrants over-built capacity; inference costs are dropping faster than training costs, compressing margins for serving providers." },
  { id: "stk6",  label: "Vertical AI SaaS",             cluster: "Startups",         domain: "a16z.com",          summary: "Vertical AI wins by embedding in existing workflows, owning proprietary data, and reducing expert labour costs — legal, medical coding, and industrial inspection lead adoption." },
  { id: "stk7",  label: "Anthropic vs OpenAI product",  cluster: "Startups",         domain: "techcrunch.com",    summary: "Anthropic bets on long context, safety, and enterprise trust; OpenAI doubles down on ecosystem breadth and consumer scale — diverging theories of how AI value accrues." },
  { id: "stk8",  label: "YC W26 batch highlights",      cluster: "Startups",         domain: "blog.ycombinator.com",summary: "W26's strongest companies cluster around AI agents for professional services, infrastructure for agentic workloads, and verticals with high-value repetitive tasks." },
  { id: "stk9",  label: "AI infra investor thesis",     cluster: "Startups",         domain: "semianalysis.com",  summary: "The infrastructure layer (training clusters, inference optimisation, observability) will capture durable margins even as model capabilities commoditise; timing GPU scarcity is key." },
];

export const DEMO_GRAPH_EDGES: DemoGraphEdge[] = [
  // ── LLM Inference intra-cluster ──────────────────────────────────────────
  { source: "llm0", target: "llm6",  similarity: 0.91 },
  { source: "llm0", target: "llm7",  similarity: 0.89 },
  { source: "llm6", target: "llm7",  similarity: 0.87 },
  { source: "llm1", target: "llm8",  similarity: 0.88 },
  { source: "llm1", target: "llm3",  similarity: 0.83 },
  { source: "llm3", target: "llm8",  similarity: 0.85 },
  { source: "llm4", target: "llm5",  similarity: 0.92 },
  { source: "llm4", target: "llm8",  similarity: 0.86 },
  { source: "llm5", target: "llm8",  similarity: 0.90 },
  { source: "llm5", target: "llm13", similarity: 0.80 },
  { source: "llm13",target: "llm3",  similarity: 0.82 },
  { source: "llm2", target: "llm9",  similarity: 0.78 },
  { source: "llm2", target: "llm12", similarity: 0.74 },
  { source: "llm9", target: "llm10", similarity: 0.86 },
  { source: "llm10",target: "llm12", similarity: 0.71 },
  { source: "llm11",target: "llm14", similarity: 0.90 },
  { source: "llm11",target: "llm5",  similarity: 0.76 },
  { source: "llm14",target: "llm2",  similarity: 0.73 },
  { source: "llm0", target: "llm4",  similarity: 0.77 },
  { source: "llm1", target: "llm13", similarity: 0.76 },
  { source: "llm12",target: "llm5",  similarity: 0.72 },

  // ── Vector Databases intra-cluster ───────────────────────────────────────
  { source: "vdb0", target: "vdb1",  similarity: 0.93 },
  { source: "vdb0", target: "vdb5",  similarity: 0.85 },
  { source: "vdb1", target: "vdb5",  similarity: 0.82 },
  { source: "vdb2", target: "vdb3",  similarity: 0.78 },
  { source: "vdb2", target: "vdb6",  similarity: 0.80 },
  { source: "vdb3", target: "vdb6",  similarity: 0.79 },
  { source: "vdb4", target: "vdb9",  similarity: 0.84 },
  { source: "vdb7", target: "vdb8",  similarity: 0.76 },
  { source: "vdb8", target: "vdb9",  similarity: 0.83 },
  { source: "vdb5", target: "vdb6",  similarity: 0.88 },
  { source: "vdb0", target: "vdb9",  similarity: 0.74 },
  { source: "vdb2", target: "vdb4",  similarity: 0.72 },

  // ── Systems Design intra-cluster ─────────────────────────────────────────
  { source: "sys0", target: "sys1",  similarity: 0.88 },
  { source: "sys0", target: "sys2",  similarity: 0.85 },
  { source: "sys1", target: "sys2",  similarity: 0.82 },
  { source: "sys3", target: "sys4",  similarity: 0.90 },
  { source: "sys3", target: "sys5",  similarity: 0.81 },
  { source: "sys4", target: "sys7",  similarity: 0.76 },
  { source: "sys6", target: "sys0",  similarity: 0.80 },
  { source: "sys6", target: "sys2",  similarity: 0.83 },
  { source: "sys7", target: "sys3",  similarity: 0.78 },
  { source: "sys8", target: "sys10", similarity: 0.75 },
  { source: "sys8", target: "sys11", similarity: 0.73 },
  { source: "sys9", target: "sys11", similarity: 0.72 },
  { source: "sys10",target: "sys7",  similarity: 0.70 },

  // ── Rust intra-cluster ────────────────────────────────────────────────────
  { source: "rst0", target: "rst1",  similarity: 0.92 },
  { source: "rst0", target: "rst6",  similarity: 0.85 },
  { source: "rst1", target: "rst6",  similarity: 0.82 },
  { source: "rst0", target: "rst4",  similarity: 0.84 },
  { source: "rst2", target: "rst7",  similarity: 0.80 },
  { source: "rst3", target: "rst7",  similarity: 0.78 },
  { source: "rst4", target: "rst7",  similarity: 0.83 },
  { source: "rst5", target: "rst7",  similarity: 0.72 },

  // ── Startups intra-cluster ────────────────────────────────────────────────
  { source: "stk0", target: "stk8",  similarity: 0.88 },
  { source: "stk0", target: "stk9",  similarity: 0.85 },
  { source: "stk1", target: "stk7",  similarity: 0.83 },
  { source: "stk1", target: "stk9",  similarity: 0.80 },
  { source: "stk2", target: "stk8",  similarity: 0.78 },
  { source: "stk3", target: "stk4",  similarity: 0.80 },
  { source: "stk4", target: "stk1",  similarity: 0.75 },
  { source: "stk5", target: "stk9",  similarity: 0.82 },
  { source: "stk6", target: "stk0",  similarity: 0.78 },
  { source: "stk6", target: "stk3",  similarity: 0.76 },
  { source: "stk7", target: "stk0",  similarity: 0.82 },

  // ── LLM ↔ Vector Databases ───────────────────────────────────────────────
  { source: "llm13",target: "vdb9",  similarity: 0.72 },
  { source: "llm5", target: "vdb9",  similarity: 0.68 },
  { source: "llm8", target: "vdb0",  similarity: 0.58 },
  { source: "vdb8", target: "llm12", similarity: 0.64 },

  // ── LLM ↔ Systems Design ─────────────────────────────────────────────────
  { source: "llm4", target: "sys4",  similarity: 0.59 },
  { source: "llm5", target: "sys4",  similarity: 0.55 },

  // ── LLM ↔ Rust ───────────────────────────────────────────────────────────
  { source: "rst7", target: "llm5",  similarity: 0.62 },
  { source: "rst2", target: "llm4",  similarity: 0.57 },

  // ── LLM ↔ Startups ───────────────────────────────────────────────────────
  { source: "stk5", target: "llm5",  similarity: 0.65 },
  { source: "stk5", target: "llm4",  similarity: 0.62 },
  { source: "stk1", target: "llm14", similarity: 0.66 },
  { source: "stk7", target: "llm0",  similarity: 0.58 },

  // ── Vector Databases ↔ Systems Design ────────────────────────────────────
  { source: "vdb0", target: "sys5",  similarity: 0.60 },
  { source: "vdb2", target: "sys7",  similarity: 0.58 },
  { source: "vdb3", target: "sys3",  similarity: 0.55 },

  // ── Vector Databases ↔ Rust ──────────────────────────────────────────────
  { source: "vdb5", target: "rst4",  similarity: 0.52 },

  // ── Systems Design ↔ Rust ────────────────────────────────────────────────
  { source: "sys3", target: "rst7",  similarity: 0.70 },
  { source: "sys4", target: "rst2",  similarity: 0.58 },
  { source: "sys8", target: "rst2",  similarity: 0.62 },
  { source: "sys0", target: "rst6",  similarity: 0.52 },

  // ── Systems Design ↔ Startups ────────────────────────────────────────────
  { source: "stk9", target: "sys3",  similarity: 0.62 },
  { source: "stk5", target: "sys4",  similarity: 0.52 },

  // ── Rust ↔ Startups ──────────────────────────────────────────────────────
  { source: "stk3", target: "rst5",  similarity: 0.65 },
  { source: "stk4", target: "rst7",  similarity: 0.60 },
];
