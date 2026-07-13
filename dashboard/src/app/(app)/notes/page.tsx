"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  FileText,
  FolderOpen,
  LayoutGrid,
  LayoutList,
  Network,
  Search as SearchIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import type { Collection, Note } from "@/lib/types";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageEmpty } from "@/components/shared/PageEmpty";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ScopeChip } from "@/components/shared/ScopeChip";
import { DemoToggle } from "@/components/shared/DemoToggle";
import { NoteRow } from "./components/NoteRow";
import { NoteGridCard } from "./components/NoteGridCard";
import { ClusterSection } from "./components/ClusterSection";
import { BulkActionBar } from "./components/BulkActionBar";
import { ListViewSkeleton, ClustersViewSkeleton } from "./components/NoteSkeletons";
import { RailStat } from "./components/RailStat";
import {
  type NoteWithMeta,
  type SortKey,
  type ViewMode,
  SORT_LABELS,
} from "./types";

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_NOTES: NoteWithMeta[] = [
  {
    id: 101, cluster: "LLM Inference", read_count: 12, liked: true,
    title: "Fast Inference from Transformers via Speculative Decoding",
    url: "https://arxiv.org/abs/2211.17192", domain: "arxiv.org",
    created_at: "2026-07-04T14:12:00Z",
    summary: "Introduces speculative decoding: a small draft model proposes tokens that the large target model verifies in a single forward pass, yielding 2–3× speedups with no change to the output distribution.",
    key_insights: ["Draft-then-verify keeps exact sampling distribution.", "Speedup scales with draft acceptance rate."],
    similar_ids: [{ id: 203, score: 0.94 }, { id: 202, score: 0.91 }, { id: 204, score: 0.87 }],
  },
  {
    id: 201, cluster: "LLM Inference", read_count: 8,
    title: "Accelerating LLM Decoding with Speculative Sampling",
    url: "https://deepmind.google/research/publications/speculative-sampling/", domain: "deepmind.google",
    created_at: "2026-07-02T11:30:00Z",
    summary: "DeepMind's speculative sampling reports 2–2.5× decoding speedups with a modified rejection scheme that provably preserves the target model's sampling distribution.",
    key_insights: ["The acceptance test is the key to unbiased sampling."],
    similar_ids: [{ id: 101, score: 0.97 }, { id: 202, score: 0.89 }, { id: 203, score: 0.85 }],
  },
  {
    id: 202, cluster: "LLM Inference", read_count: 5, liked: true,
    title: "How Speculative Decoding Works in vLLM",
    url: "https://blog.vllm.ai/2024/10/17/spec-decode.html", domain: "blog.vllm.ai",
    created_at: "2026-06-30T16:45:00Z",
    summary: "Practical notes on integrating draft models, n-gram proposers, and Medusa heads. Acceptance rate — not draft latency — dominates realized throughput.",
    key_insights: ["Batching erodes speculative gains as the GPU saturates.", "n-gram drafting needs no second model."],
    similar_ids: [{ id: 101, score: 0.91 }, { id: 203, score: 0.88 }, { id: 204, score: 0.82 }],
  },
  {
    id: 203, cluster: "LLM Inference", read_count: 3,
    title: "Medusa: Multiple Decoding Heads for LLM Inference",
    url: "https://arxiv.org/abs/2401.10774", domain: "arxiv.org",
    created_at: "2026-06-28T10:00:00Z",
    summary: "Medusa adds extra decoding heads that predict several future tokens in parallel, then verifies them with a tree-based attention mask — no separate draft model needed.",
    key_insights: ["Tree attention verifies many candidate continuations at once."],
    similar_ids: [{ id: 101, score: 0.94 }, { id: 201, score: 0.85 }, { id: 202, score: 0.88 }],
  },
  {
    id: 103, cluster: "Vector Databases", read_count: 15, liked: true,
    title: "pgvector: Storing and Querying Embeddings in Postgres",
    url: "https://github.com/pgvector/pgvector", domain: "github.com",
    created_at: "2026-07-01T18:05:00Z",
    summary: "HNSW and IVFFlat index types for approximate nearest-neighbour search directly in Postgres, with cosine / L2 / inner-product operators and tunable recall.",
    key_insights: ["HNSW gives better recall at query time; IVFFlat builds faster."],
    similar_ids: [{ id: 301, score: 0.88 }, { id: 303, score: 0.85 }, { id: 302, score: 0.81 }],
  },
  {
    id: 102, cluster: "Systems Design", read_count: 9,
    title: "Designing Data-Intensive Applications — Ch. 5: Replication",
    url: "https://dataintensive.net/", domain: "dataintensive.net",
    created_at: "2026-07-03T09:40:00Z",
    summary: "Leader-based, multi-leader, and leaderless replication compared through the lens of consistency, latency, and failover. Quorum reads/writes trade availability against staleness.",
    key_insights: ["Read-your-writes needs sticky routing or version tracking."],
    similar_ids: [{ id: 402, score: 0.88 }, { id: 403, score: 0.84 }, { id: 105, score: 0.79 }],
  },
  {
    id: 104, cluster: "Rust", read_count: 8,
    title: "The Rust Programming Language — Ownership",
    url: "https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html", domain: "doc.rust-lang.org",
    created_at: "2026-06-29T21:22:00Z",
    summary: "Ownership, borrowing, and lifetimes give memory safety without a garbage collector by enforcing a single owner and compile-time borrow checking.",
    key_insights: [],
    similar_ids: [{ id: 501, score: 0.88 }, { id: 502, score: 0.82 }],
  },
];

const MOCK_COLLECTIONS: Collection[] = [
  { id: 1, name: "LLM Inference", created_at: "2026-06-02T10:00:00Z" },
  { id: 2, name: "Systems Design", created_at: "2026-05-21T10:00:00Z" },
  { id: 3, name: "Vector Databases", created_at: "2026-05-14T10:00:00Z" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTopDomains(notes: NoteWithMeta[], limit = 7): string[] {
  const counts = new Map<string, number>();
  notes.forEach((n) => {
    if (n.domain) counts.set(n.domain, (counts.get(n.domain) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([d]) => d);
}

function applySort(notes: NoteWithMeta[], sort: SortKey): NoteWithMeta[] {
  const s = [...notes];
  if (sort === "az") return s.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  if (sort === "liked") return s.sort((a, b) => (b.liked ? 1 : 0) - (a.liked ? 1 : 0));
  return s.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function applyFilters(
  notes: NoteWithMeta[],
  domain: string | null,
  likedOnly: boolean,
  search: string
): NoteWithMeta[] {
  return notes.filter((n) => {
    if (domain && n.domain !== domain) return false;
    if (likedOnly && !n.liked) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(n.title ?? "").toLowerCase().includes(q) &&
        !n.summary.toLowerCase().includes(q) &&
        !(n.domain ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
}

function ViewToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-7 items-center justify-center rounded transition-colors",
        active
          ? "bg-surface-elevated text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotesPage() {
  useRequireAuth();

  const [notes, setNotes] = useState<NoteWithMeta[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortKey>("date_saved");
  const [filterDomain, setFilterDomain] = useState<string | null>(null);
  const [filterLiked, setFilterLiked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedSimilar, setExpandedSimilar] = useState<number | null>(null);

  useEffect(() => {
    const isDemo =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1";
    if (isDemo) enableDemo();
    else loadAll();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [notesRes, colsRes] = await Promise.allSettled([
        apiFetch<{ notes: Note[] }>("/api/notes?limit=200"),
        apiFetch<{ collections: Collection[] }>("/api/collections"),
      ]);
      const raw = notesRes.status === "fulfilled" ? notesRes.value.notes ?? [] : [];
      const cols = colsRes.status === "fulfilled" ? colsRes.value.collections ?? [] : [];
      setNotes(raw.map((n) => ({ ...n, read_count: 0, cluster: "Uncategorized", similar_ids: [] })));
      setCollections(cols);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }

  function enableDemo() {
    setDemo(true);
    setLoading(false);
    setError(null);
    setNotes(MOCK_NOTES);
    setCollections(MOCK_COLLECTIONS);
  }

  function disableDemo() {
    setDemo(false);
    loadAll();
  }

  async function toggleLike(note: NoteWithMeta) {
    const wasLiked = note.liked;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, liked: !wasLiked } : n))
    );
    if (demo) return;
    try {
      await apiFetch(`/api/notes/${note.id}/like`, {
        method: wasLiked ? "DELETE" : "POST",
      });
    } catch (err) {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, liked: wasLiked } : n))
      );
      toast.error(err instanceof Error ? err.message : "Failed to update like");
    }
  }

  async function deleteNote(noteId: number) {
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== noteId));
    if (selectedIds.has(noteId))
      setSelectedIds((s) => {
        const n = new Set(s);
        n.delete(noteId);
        return n;
      });
    if (demo) return;
    try {
      await apiFetch(`/api/notes/${noteId}`, { method: "DELETE" });
      toast.success("Note deleted.");
    } catch (err) {
      setNotes(prev);
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function addNoteToCollection(noteId: number, collectionId: number) {
    const name = collections.find((c) => c.id === collectionId)?.name ?? "Collection";
    try {
      if (!demo)
        await apiFetch(`/api/collections/${collectionId}/notes`, {
          method: "POST",
          body: JSON.stringify({ note_id: noteId }),
        });
      toast.success(`Added to ${name}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add note");
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearBulk() {
    setBulkMode(false);
    setSelectedIds(new Set());
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    setNotes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    clearBulk();
    if (demo) { toast.success(`Deleted ${ids.length} notes.`); return; }
    await Promise.all(
      ids.map((id) => apiFetch(`/api/notes/${id}`, { method: "DELETE" }).catch(() => {}))
    );
    toast.success(`Deleted ${ids.length} notes.`);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const topDomains = useMemo(() => getTopDomains(notes), [notes]);
  const filtered = useMemo(
    () => applyFilters(notes, filterDomain, filterLiked, searchQuery),
    [notes, filterDomain, filterLiked, searchQuery]
  );
  const sorted = useMemo(() => applySort(filtered, sort), [filtered, sort]);

  const clusterGroups = useMemo(() => {
    const map = new Map<string, NoteWithMeta[]>();
    sorted.forEach((n) => {
      const c = n.cluster || "Other";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(n);
    });
    return [...map.entries()].map(([name, notes]) => ({ name, notes }));
  }, [sorted]);

  const thisWeekCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return notes.filter((n) => new Date(n.created_at).getTime() >= weekAgo).length;
  }, [notes]);

  const likedCount = useMemo(() => notes.filter((n) => n.liked).length, [notes]);
  const isFiltered = Boolean(searchQuery || filterDomain || filterLiked);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-12">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading your knowledge base…"
              : `${notes.length.toLocaleString()} saved ${notes.length === 1 ? "note" : "notes"} · semantic search and clustering`}
          </p>
        </div>
        <DemoToggle active={demo} onToggle={() => (demo ? disableDemo() : enableDemo())} />
      </div>

      {/* Sticky control bar */}
      <div className="sticky top-0 z-10 -mx-6 bg-background/95 px-6 pb-4 pt-4 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within notes…"
            aria-label="Search within your saved notes"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-11 pr-16 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring/50 focus:ring-[3px] focus:ring-ring/25"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
              ⌘K
            </kbd>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-surface-elevated">
                {SORT_LABELS[sort]}
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <DropdownMenuItem
                  key={k}
                  onClick={() => setSort(k)}
                  className={cn(sort === k && "text-accent")}
                >
                  {SORT_LABELS[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-border" />

          {/* Domain filter chips */}
          <ScopeChip active={filterDomain === null} onClick={() => setFilterDomain(null)} label="All domains" />
          {topDomains.slice(0, 5).map((d) => (
            <ScopeChip
              key={d}
              active={filterDomain === d}
              onClick={() => setFilterDomain(filterDomain === d ? null : d)}
              label={d}
            />
          ))}

          <div className="h-4 w-px bg-border" />

          <ScopeChip
            active={filterLiked}
            onClick={() => setFilterLiked((v) => !v)}
            label="Liked"
            accent={filterLiked}
          />

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
            <ViewToggleButton active={view === "list"} onClick={() => setView("list")} label="List view">
              <LayoutList className="size-3.5" />
            </ViewToggleButton>
            <ViewToggleButton active={view === "grid"} onClick={() => setView("grid")} label="Grid view">
              <LayoutGrid className="size-3.5" />
            </ViewToggleButton>
            <ViewToggleButton active={view === "clusters"} onClick={() => setView("clusters")} label="Clusters view">
              <Network className="size-3.5" />
            </ViewToggleButton>
          </div>

          {/* Bulk select */}
          <button
            onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-2xs uppercase tracking-wider transition-colors",
              bulkMode
                ? "border-border bg-surface-elevated text-foreground"
                : "border-transparent text-muted-foreground hover:bg-surface hover:text-foreground"
            )}
          >
            Select
          </button>
        </div>
      </div>

      {/* Two-column workspace */}
      <div className="mt-2 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        {/* Main content */}
        <div className="min-w-0">
          {loading ? (
            view === "clusters" ? <ClustersViewSkeleton /> : <ListViewSkeleton />
          ) : error ? (
            <div className="rounded-lg border border-border bg-surface px-5 py-8 text-center">
              <p className="text-sm font-medium text-foreground">Failed to load</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <button
                onClick={loadAll}
                className="mt-4 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Retry
              </button>
            </div>
          ) : sorted.length === 0 ? (
            <PageEmpty
              icon={<FileText className="size-5" />}
              title={isFiltered ? "No notes match" : "No notes yet"}
              copy={
                isFiltered
                  ? "Try adjusting your search or removing a filter."
                  : "Save a page with the browser extension and its summary, insights, and embeddings will appear here."
              }
              action={
                isFiltered ? (
                  <button
                    onClick={() => { setSearchQuery(""); setFilterDomain(null); setFilterLiked(false); }}
                    className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Clear filters
                  </button>
                ) : null
              }
            />
          ) : view === "list" ? (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {sorted.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  allNotes={notes}
                  collections={collections}
                  bulkMode={bulkMode}
                  selected={selectedIds.has(note.id)}
                  similarOpen={expandedSimilar === note.id}
                  onSelect={() => toggleSelect(note.id)}
                  onLike={() => toggleLike(note)}
                  onDelete={() => deleteNote(note.id)}
                  onAddTo={(cid) => addNoteToCollection(note.id, cid)}
                  onFindSimilar={() =>
                    setExpandedSimilar(expandedSimilar === note.id ? null : note.id)
                  }
                />
              ))}
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sorted.map((note) => (
                <NoteGridCard
                  key={note.id}
                  note={note}
                  collections={collections}
                  bulkMode={bulkMode}
                  selected={selectedIds.has(note.id)}
                  onSelect={() => toggleSelect(note.id)}
                  onLike={() => toggleLike(note)}
                  onDelete={() => deleteNote(note.id)}
                  onAddTo={(cid) => addNoteToCollection(note.id, cid)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {clusterGroups.map(({ name, notes: cn }) => (
                <ClusterSection
                  key={name}
                  name={name}
                  clusterNotes={cn}
                  allNotes={notes}
                  collections={collections}
                  bulkMode={bulkMode}
                  selectedIds={selectedIds}
                  expandedSimilar={expandedSimilar}
                  onSelect={toggleSelect}
                  onLike={(n) => toggleLike(n)}
                  onDelete={(id) => deleteNote(id)}
                  onAddTo={(nid, cid) => addNoteToCollection(nid, cid)}
                  onFindSimilar={(id) =>
                    setExpandedSimilar(expandedSimilar === id ? null : id)
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            <RailStat label="Total"     value={loading ? null : notes.length} />
            <RailStat label="Liked"     value={loading ? null : likedCount} accent />
            <RailStat label="This week" value={loading ? null : thisWeekCount} />
            <RailStat label="Clusters"  value={loading ? null : clusterGroups.length} />
          </div>

          {/* Domain filter */}
          <div>
            <SectionHeader title="Source domains" />
            {loading ? (
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-6 w-20 rounded-md" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {topDomains.map((d) => {
                  const count = notes.filter((n) => n.domain === d).length;
                  const active = filterDomain === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setFilterDomain(active ? null : d)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-2xs transition-colors",
                        active
                          ? "border-accent/30 text-accent"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {d}
                      <span className={cn("opacity-50", active && "text-accent")}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Collections */}
          {!loading && collections.length > 0 && (
            <div>
              <SectionHeader title="Collections" />
              <div className="space-y-1.5">
                {collections.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  >
                    <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Bulk action bar */}
      {bulkMode && selectedIds.size > 0 && (
        <BulkActionBar count={selectedIds.size} onDelete={bulkDelete} onClear={clearBulk} />
      )}
    </div>
  );
}
