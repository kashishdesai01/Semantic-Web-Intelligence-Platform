"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  FolderOpen,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Collection, Note } from "@/lib/types";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageEmpty } from "@/components/shared/PageEmpty";
import { DemoToggle } from "@/components/shared/DemoToggle";
import {
  CollectionCard,
  type CollectionWithMeta,
} from "./components/CollectionCard";
import {
  SuggestedCard,
  type SuggestedCollection,
} from "./components/SuggestedCard";
import { CollectionNoteRow } from "./components/CollectionNoteRow";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_COLLECTIONS: CollectionWithMeta[] = [
  {
    id: 1,
    name: "LLM Inference",
    created_at: "2026-06-02T10:00:00Z",
    note_count: 6,
    updated_at: "2026-07-04T14:12:00Z",
    preview_domains: ["arxiv.org", "deepmind.google", "blog.vllm.ai"],
    preview_titles: [
      "Fast Inference from Transformers via Speculative Decoding",
      "Medusa: Multiple Decoding Heads for LLM Inference",
    ],
  },
  {
    id: 2,
    name: "Systems Design",
    created_at: "2026-05-21T10:00:00Z",
    note_count: 5,
    updated_at: "2026-07-03T09:40:00Z",
    preview_domains: ["dataintensive.net", "discord.com", "engineering.fb.com"],
    preview_titles: [
      "Designing Data-Intensive Applications — Ch. 5: Replication",
      "How Discord Stores Trillions of Messages",
    ],
  },
  {
    id: 3,
    name: "Vector Databases",
    created_at: "2026-05-14T10:00:00Z",
    note_count: 4,
    updated_at: "2026-07-01T18:05:00Z",
    preview_domains: ["github.com", "docs.pinecone.io", "weaviate.io", "arxiv.org"],
    preview_titles: [
      "pgvector: Storing and Querying Embeddings in Postgres",
      "HNSW: Efficient and Robust ANN Search",
    ],
  },
  {
    id: 4,
    name: "Papers to Reread",
    created_at: "2026-04-30T10:00:00Z",
    note_count: 7,
    updated_at: "2026-06-29T21:22:00Z",
    preview_domains: ["arxiv.org", "raft.github.io", "dl.acm.org"],
    preview_titles: [
      "Dynamo: Amazon's Highly Available Key-Value Store",
      "Efficiently Scaling Transformer Inference",
    ],
  },
];

const MOCK_SUGGESTED: SuggestedCollection[] = [
  {
    id: "s1",
    name: "Rust Programming",
    note_count: 3,
    example_titles: [
      "The Rust Programming Language — Ownership",
      "Fearless Concurrency in Rust",
      "Tokio: An Asynchronous Rust Runtime",
    ],
  },
  {
    id: "s2",
    name: "ANN & Index Structures",
    note_count: 4,
    example_titles: [
      "HNSW: Efficient and Robust ANN Search",
      "pgvector: Storing and Querying Embeddings in Postgres",
      "Weaviate: Vector-first Database Architecture",
    ],
  },
];

const MOCK_NOTES_BY_COLLECTION: Record<number, Note[]> = {
  1: [
    {
      id: 101, title: "Fast Inference from Transformers via Speculative Decoding",
      url: "https://arxiv.org/abs/2211.17192", domain: "arxiv.org",
      created_at: "2026-07-04T14:12:00Z",
      summary: "Introduces speculative decoding: a small draft model proposes tokens that the large target model verifies in a single forward pass, yielding 2–3× speedups with no change to the output distribution.",
      key_insights: [], liked: true,
    },
    {
      id: 201, title: "Accelerating LLM Decoding with Speculative Sampling",
      url: "https://deepmind.google/research/publications/speculative-sampling/", domain: "deepmind.google",
      created_at: "2026-07-02T11:30:00Z",
      summary: "DeepMind's speculative sampling reports 2–2.5× decoding speedups with a modified rejection scheme that provably preserves the target model's sampling distribution.",
      key_insights: [],
    },
    {
      id: 202, title: "How Speculative Decoding Works in vLLM",
      url: "https://blog.vllm.ai/2024/10/17/spec-decode.html", domain: "blog.vllm.ai",
      created_at: "2026-06-30T16:45:00Z",
      summary: "Practical notes on integrating draft models, n-gram proposers, and Medusa heads. Acceptance rate — not draft latency — dominates realized throughput.",
      key_insights: [],
    },
    {
      id: 203, title: "Medusa: Multiple Decoding Heads for LLM Inference",
      url: "https://arxiv.org/abs/2401.10774", domain: "arxiv.org",
      created_at: "2026-06-28T10:00:00Z",
      summary: "Medusa adds extra decoding heads that predict several future tokens in parallel, then verifies them with a tree-based attention mask — no separate draft model needed.",
      key_insights: [],
    },
    {
      id: 204, title: "FlashAttention-2: Faster Attention with Better Parallelism",
      url: "https://arxiv.org/abs/2307.08691", domain: "arxiv.org",
      created_at: "2026-06-25T09:15:00Z",
      summary: "FlashAttention-2 achieves 2× the throughput of FlashAttention via improved work partitioning across thread blocks and reduced non-matrix-multiply FLOPs.",
      key_insights: [],
    },
    {
      id: 205, title: "Efficiently Scaling Transformer Inference",
      url: "https://arxiv.org/abs/2211.05100", domain: "arxiv.org",
      created_at: "2026-06-22T14:00:00Z",
      summary: "Analysis of memory and compute bottlenecks in transformer inference: KV-cache sizing, partitioning strategies across accelerators, and latency/throughput tradeoffs.",
      key_insights: [],
    },
  ],
  2: [
    {
      id: 102, title: "Designing Data-Intensive Applications — Ch. 5: Replication",
      url: "https://dataintensive.net/", domain: "dataintensive.net",
      created_at: "2026-07-03T09:40:00Z",
      summary: "Leader-based, multi-leader, and leaderless replication compared through the lens of consistency, latency, and failover.",
      key_insights: [],
    },
    {
      id: 105, title: "How Discord Stores Trillions of Messages",
      url: "https://discord.com/blog/how-discord-stores-trillions-of-messages", domain: "discord.com",
      created_at: "2026-06-27T12:00:00Z",
      summary: "Migration from Cassandra to ScyllaDB plus a Rust data-services layer to tame tail latencies and hot partitions at trillions of rows.",
      key_insights: [], liked: true,
    },
  ],
  3: [
    {
      id: 103, title: "pgvector: Storing and Querying Embeddings in Postgres",
      url: "https://github.com/pgvector/pgvector", domain: "github.com",
      created_at: "2026-07-01T18:05:00Z",
      summary: "HNSW and IVFFlat index types for approximate nearest-neighbour search directly in Postgres, with cosine / L2 / inner-product operators and tunable recall.",
      key_insights: [], liked: true,
    },
    {
      id: 301, title: "Pinecone: The Managed Vector Database",
      url: "https://docs.pinecone.io/guides/get-started/overview", domain: "docs.pinecone.io",
      created_at: "2026-06-26T11:00:00Z",
      summary: "Pinecone abstracts HNSW index management behind a serverless API, adding namespace isolation, metadata filtering, and hybrid sparse-dense retrieval.",
      key_insights: [],
    },
  ],
  4: [
    {
      id: 403, title: "Dynamo: Amazon's Highly Available Key-Value Store",
      url: "https://dl.acm.org/doi/10.1145/1294261.1294281", domain: "dl.acm.org",
      created_at: "2026-06-08T11:30:00Z",
      summary: "Dynamo sacrifices strong consistency for availability using consistent hashing, vector clocks, and sloppy quorums.",
      key_insights: [],
    },
    {
      id: 104, title: "The Rust Programming Language — Ownership",
      url: "https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html", domain: "doc.rust-lang.org",
      created_at: "2026-06-29T21:22:00Z",
      summary: "Ownership, borrowing, and lifetimes give memory safety without a garbage collector by enforcing a single owner and compile-time borrow checking.",
      key_insights: [],
    },
  ],
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  useRequireAuth();

  const [collections, setCollections] = useState<CollectionWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);

  const [creatingInline, setCreatingInline] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creating, setCreating] = useState(false);

  const [activeCollectionId, setActiveCollectionId] = useState<number | null>(null);
  const [collectionNotes, setCollectionNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    const isDemo =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1";
    if (isDemo) enableDemo();
    else loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const res = await apiFetch<{ collections: Collection[] }>("/api/collections");
      setCollections(
        (res.collections ?? []).map((c) => ({
          ...c,
          note_count: 0,
          updated_at: c.created_at,
          preview_domains: [],
          preview_titles: [],
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }

  function enableDemo() {
    setDemo(true);
    setLoading(false);
    setCollections(MOCK_COLLECTIONS);
  }

  function disableDemo() {
    setDemo(false);
    setActiveCollectionId(null);
    setCollectionNotes([]);
    loadAll();
  }

  async function openCollection(id: number) {
    setActiveCollectionId(id);
    setLoadingNotes(true);
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 200));
        setCollectionNotes(MOCK_NOTES_BY_COLLECTION[id] ?? []);
      } else {
        const res = await apiFetch<{ notes: Note[] }>(`/api/collections/${id}/notes`);
        setCollectionNotes(res.notes ?? []);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoadingNotes(false);
    }
  }

  async function createCollection() {
    const name = newCollectionName.trim();
    if (!name) return;
    setCreating(true);
    try {
      if (demo) {
        const newCol: CollectionWithMeta = {
          id: Date.now(), name,
          created_at: new Date().toISOString(),
          note_count: 0, updated_at: new Date().toISOString(),
          preview_domains: [], preview_titles: [],
        };
        setCollections((prev) => [newCol, ...prev]);
      } else {
        const res = await apiFetch<{ collection: Collection }>("/api/collections", {
          method: "POST",
          body: JSON.stringify({ name }),
        });
        setCollections((prev) => [
          { ...res.collection, note_count: 0, updated_at: res.collection.created_at, preview_domains: [], preview_titles: [] },
          ...prev,
        ]);
      }
      setNewCollectionName("");
      setCreatingInline(false);
      toast.success("Collection created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create collection");
    } finally {
      setCreating(false);
    }
  }

  async function deleteCollection(id: number) {
    const prev = collections;
    setCollections((c) => c.filter((x) => x.id !== id));
    if (activeCollectionId === id) {
      setActiveCollectionId(null);
      setCollectionNotes([]);
    }
    if (demo) { toast.success("Collection deleted."); return; }
    try {
      await apiFetch(`/api/collections/${id}`, { method: "DELETE" });
      toast.success("Collection deleted.");
    } catch (err) {
      setCollections(prev);
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  function startRename(col: CollectionWithMeta) {
    setRenamingId(col.id);
    setRenameValue(col.name);
  }

  async function commitRename(id: number) {
    const name = renameValue.trim();
    if (!name) { setRenamingId(null); return; }
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    setRenamingId(null);
    if (demo) { toast.success("Renamed."); return; }
    try {
      await apiFetch(`/api/collections/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      toast.success("Renamed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename");
    }
  }

  function acceptSuggestion(s: SuggestedCollection) {
    setAcceptedSuggestions((prev) => new Set([...prev, s.id]));
    const newCol: CollectionWithMeta = {
      id: Date.now(), name: s.name,
      created_at: new Date().toISOString(),
      note_count: s.note_count, updated_at: new Date().toISOString(),
      preview_domains: [], preview_titles: s.example_titles,
    };
    setCollections((prev) => [newCol, ...prev]);
    toast.success(`"${s.name}" added to your collections.`);
  }

  const activeCollection = collections.find((c) => c.id === activeCollectionId);
  const visibleSuggestions = demo
    ? MOCK_SUGGESTED.filter(
        (s) => !dismissedSuggestions.has(s.id) && !acceptedSuggestions.has(s.id)
      )
    : [];

  // ── Detail view ────────────────────────────────────────────────────────────

  if (activeCollectionId !== null && activeCollection) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-12">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveCollectionId(null);
                setCollectionNotes([]);
                setRenamingId(null);
              }}
              aria-label="Back to collections"
              className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              {renamingId === activeCollection.id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(activeCollection.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="h-9 w-64 rounded-md border border-border bg-surface px-3 text-2xl font-semibold tracking-tight text-foreground outline-none transition-colors focus:border-ring/50 focus:ring-[3px] focus:ring-ring/25"
                  />
                  <button
                    onClick={() => commitRename(activeCollection.id)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => setRenamingId(null)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {activeCollection.name}
                </h1>
              )}
              <p className="mt-0.5 text-sm text-muted-foreground">
                {loadingNotes
                  ? "Loading notes…"
                  : `${collectionNotes.length} ${collectionNotes.length === 1 ? "note" : "notes"}`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => startRename(activeCollection)}>
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => deleteCollection(activeCollection.id)}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {loadingNotes ? (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2 px-4 py-3">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              ))}
            </div>
          ) : collectionNotes.length === 0 ? (
            <PageEmpty
              icon={<FileText className="size-5" />}
              title="No notes in this collection"
              copy="Add notes to this collection from the Notes page using the folder icon on any note."
            />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {collectionNotes.map((note) => (
                <CollectionNoteRow
                  key={note.id}
                  note={note}
                  onDelete={() =>
                    setCollectionNotes((prev) => prev.filter((n) => n.id !== note.id))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Gallery view ───────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Collections
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading your collections…"
              : `${collections.length} ${collections.length === 1 ? "collection" : "collections"} · group related notes into themes`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoToggle active={demo} onToggle={() => (demo ? disableDemo() : enableDemo())} />
          <Button variant="accent" size="sm" onClick={() => setCreatingInline(true)}>
            <Plus className="size-4" />
            New collection
          </Button>
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                  <Skeleton className="h-5 w-14 rounded-md" />
                </div>
                <div className="space-y-1.5 border-t border-border pt-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : collections.length === 0 && !creatingInline ? (
          <PageEmpty
            icon={<FolderOpen className="size-5" />}
            title="No collections yet"
            copy="Group related notes into a collection and search or revisit them together."
            action={
              <Button variant="accent" size="sm" onClick={() => setCreatingInline(true)}>
                <Plus className="size-4" />
                New collection
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creatingInline && (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-medium text-foreground">New collection</p>
                <input
                  autoFocus
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createCollection();
                    if (e.key === "Escape") {
                      setCreatingInline(false);
                      setNewCollectionName("");
                    }
                  }}
                  placeholder="Collection name"
                  className="h-9 w-full rounded-md border border-border bg-surface-elevated px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring/50 focus:ring-[3px] focus:ring-ring/25"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={createCollection}
                    disabled={creating || !newCollectionName.trim()}
                  >
                    {creating ? "Creating…" : "Create"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setCreatingInline(false); setNewCollectionName(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {collections.map((col) =>
              renamingId === col.id ? (
                <div key={col.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
                  <p className="text-sm font-medium text-foreground">Rename</p>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(col.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="h-9 w-full rounded-md border border-border bg-surface-elevated px-3 text-sm text-foreground outline-none transition-colors focus:border-ring/50 focus:ring-[3px] focus:ring-ring/25"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => commitRename(col.id)} disabled={!renameValue.trim()}>
                      <Check className="size-3.5" />
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <CollectionCard
                  key={col.id}
                  collection={col}
                  onOpen={() => openCollection(col.id)}
                  onRename={() => startRename(col)}
                  onDelete={() => deleteCollection(col.id)}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Suggested collections */}
      {visibleSuggestions.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-3.5 text-accent" />
            <h2 className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
              Suggested by your notes
            </h2>
            <span className="font-mono text-2xs text-muted-foreground/50">· auto-clustered</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleSuggestions.map((s) => (
              <SuggestedCard
                key={s.id}
                suggestion={s}
                onAccept={() => acceptSuggestion(s)}
                onDismiss={() =>
                  setDismissedSuggestions((prev) => new Set([...prev, s.id]))
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
