"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  FileText,
  FolderOpen,
  FolderPlus,
  Heart,
  Newspaper,
  Plus,
  Search as SearchIcon,
  Trash2,
} from "lucide-react";
import { apiFetch, clearToken } from "@/lib/api";
import { pollJob } from "@/lib/jobs";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  SourceCard,
  SourceCardSkeleton,
  type ScoredSource,
} from "@/components/dashboard/SourceCard";
import { AnswerBlock, AnswerSkeleton } from "@/components/dashboard/AnswerBlock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Citation, Collection, Note, Totals } from "@/lib/types";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  DEMO_ANSWER,
  DEMO_COLLECTIONS,
  DEMO_DIGEST,
  DEMO_NOTES,
  DEMO_QUERY,
  DEMO_SERIES,
  DEMO_SOURCES,
  DEMO_TOTALS,
} from "@/lib/demo";

type SearchResult = Note & { distance: number };
type Digest = {
  summary: string;
  themes: { title: string; summary: string; note_ids: number[] }[];
};

function hostFrom(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Cosine distance -> [0,1] relevance, clamped for display. */
function toScore(distance: number) {
  return Math.max(0, Math.min(1, 1 - distance));
}

export default function DashboardPage() {
  useRequireAuth();

  const [totals, setTotals] = useState<Totals | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  // Search / synthesized answer (Zone 1)
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<number | "">("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<ScoredSource[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  // Collections (Zone 4a)
  const [newCollection, setNewCollection] = useState("");
  const [addingCollection, setAddingCollection] = useState(false);
  const [creatingCollection, setCreatingCollection] = useState(false);

  // Recent notes (Zone 4b)
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<{
    noteId: number;
    collectionName: string;
  } | null>(null);

  // Digest (Zone 3)
  const [digest, setDigest] = useState<Digest | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);

  useEffect(() => {
    const isDemo =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1";
    if (isDemo) enableDemo();
    else loadAll();
  }, []);

  // ⌘K / Ctrl+K focuses search.
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
    setError(null);
    setLoading(true);
    try {
      const analytics = await apiFetch<{
        totals: Totals;
        recent_notes: Note[];
      }>("/api/analytics/summary");
      setTotals(analytics.totals);
      setNotes(analytics.recent_notes || []);
      const res = await apiFetch<{ collections: Collection[] }>(
        "/api/collections"
      );
      setCollections(res.collections || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  function enableDemo() {
    setDemo(true);
    setError(null);
    setLoading(false);
    setTotals(DEMO_TOTALS);
    setNotes(DEMO_NOTES);
    setCollections(DEMO_COLLECTIONS);
    setQuery(DEMO_QUERY);
    setAnswer(DEMO_ANSWER);
    setSources(DEMO_SOURCES);
    setHasSearched(true);
  }

  function disableDemo() {
    setDemo(false);
    setQuery("");
    setAnswer(null);
    setSources([]);
    setHasSearched(false);
    setDigest(null);
    loadAll();
  }

  async function runSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    if (demo) return; // demo results are pinned
    setSearching(true);
    setHasSearched(true);
    setAnswer(null);
    setSources([]);
    try {
      const params = new URLSearchParams({
        q: query.trim(),
        limit: "6",
        min_similarity: "0.75",
      });
      if (scope) params.set("collection_id", String(scope));

      const [ask, search] = await Promise.allSettled([
        apiFetch<{
          answer: string;
          answer_with_citations?: string;
          citations: Citation[];
        }>("/api/ask", {
          method: "POST",
          body: JSON.stringify({ question: query.trim() }),
        }),
        apiFetch<{ results: SearchResult[] }>(
          `/api/notes/search?${params.toString()}`
        ),
      ]);

      // Real relevance scores keyed by note id, from vector search.
      const scoreById = new Map<number, number>();
      const searchResults =
        search.status === "fulfilled" ? search.value.results ?? [] : [];
      searchResults.forEach((r) => scoreById.set(r.id, toScore(r.distance)));

      let built: ScoredSource[] = [];
      if (ask.status === "fulfilled" && ask.value.citations?.length) {
        built = ask.value.citations.map((c, i) => ({
          id: c.note_id,
          index: i + 1,
          title: c.title || "Untitled",
          url: c.url,
          domain: hostFrom(c.url),
          snippet: c.highlights?.[0] ?? "",
          score: scoreById.get(c.note_id),
          insights: c.highlights?.slice(1),
        }));
        setAnswer(ask.value.answer_with_citations || ask.value.answer || null);
      } else {
        // No synthesized answer — fall back to ranked search results.
        built = searchResults.map((r, i) => ({
          id: r.id,
          index: i + 1,
          title: r.title || "Untitled",
          url: r.url,
          domain: r.domain || hostFrom(r.url),
          snippet: r.summary,
          score: toScore(r.distance),
          insights: r.key_insights,
        }));
        setAnswer(null);
      }
      setSources(built);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function toggleSaveSource(s: ScoredSource) {
    setSources((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, saved: !x.saved } : x))
    );
  }

  async function createCollection() {
    const name = newCollection.trim();
    if (!name) return;
    setCreatingCollection(true);
    try {
      if (demo) {
        setCollections((prev) => [
          { id: Date.now(), name, created_at: new Date().toISOString() },
          ...prev,
        ]);
      } else {
        const res = await apiFetch<{ collection: Collection }>(
          "/api/collections",
          { method: "POST", body: JSON.stringify({ name }) }
        );
        setCollections((prev) => [res.collection, ...prev]);
      }
      setNewCollection("");
      setAddingCollection(false);
      toast.success("Collection created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreatingCollection(false);
    }
  }

  async function toggleLike(note: Note) {
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

  async function addNoteToCollection(noteId: number, collectionId: number) {
    const name =
      collections.find((c) => c.id === collectionId)?.name || "Collection";
    try {
      if (!demo) {
        await apiFetch(`/api/collections/${collectionId}/notes`, {
          method: "POST",
          body: JSON.stringify({ note_id: noteId }),
        });
      }
      toast.success(`Added to ${name}.`);
      setRecentlyAdded({ noteId, collectionName: name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add note");
    }
  }

  async function deleteNote(noteId: number) {
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== noteId));
    if (demo) return;
    try {
      await apiFetch(`/api/notes/${noteId}`, { method: "DELETE" });
      toast.success("Note deleted.");
    } catch (err) {
      setNotes(prev);
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function loadWeeklyDigest() {
    setDigestLoading(true);
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 700));
        setDigest(DEMO_DIGEST);
        toast.success("Digest ready.");
        return;
      }
      const res = await apiFetch<{ status?: string; job_id?: string } & Digest>(
        "/api/digest/weekly"
      );
      if (res?.status === "queued" && res.job_id) {
        pollJob<Digest>(
          apiFetch,
          res.job_id,
          (result) => {
            setDigest(result);
            toast.success("Digest ready.");
          },
          (message) => toast.error(message)
        );
      } else {
        setDigest(res);
        toast.success("Digest ready.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load digest");
    } finally {
      setDigestLoading(false);
    }
  }

  function signOut() {
    clearToken();
    window.location.href = "/login";
  }

  const visibleNotes = showAllNotes ? notes : notes.slice(0, 5);
  const stats: {
    label: string;
    value: number;
    series?: number[];
    hint?: string;
  }[] = [
    {
      label: "Total notes",
      value: totals?.total_notes ?? 0,
      series: demo ? DEMO_SERIES.notes : undefined,
      hint: demo ? "+11 this week" : undefined,
    },
    {
      label: "Total sources",
      value: totals?.total_sources ?? 0,
      series: demo ? DEMO_SERIES.sources : undefined,
      hint: demo ? "+3 this week" : undefined,
    },
    {
      label: "Collections",
      value: collections.length,
      series: demo ? DEMO_SERIES.collections : undefined,
      hint: demo ? "+1 this week" : undefined,
    },
  ];

  return (
    <div className="fixed inset-0 z-10 flex">
      <DashboardSidebar onSignOut={signOut} />

      <main className="h-full flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
          {/* Header */}
          <div className="mb-9 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Home
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Search and synthesize across everything you&apos;ve saved.
              </p>
            </div>
            <button
              onClick={() => (demo ? disableDemo() : enableDemo())}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-2xs uppercase tracking-wider transition-colors",
                demo
                  ? "border-accent/30 text-accent"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  demo ? "bg-accent" : "bg-muted-foreground/50"
                )}
              />
              Demo data
            </button>
          </div>

          {error ? (
            <div className="mb-8">
              <ErrorState message={error} onRetry={loadAll} />
            </div>
          ) : null}

          {/* ── Zone 1 · Semantic search ─────────────────────────────── */}
          <section className="mb-12">
            <form onSubmit={runSearch}>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask your knowledge base…"
                  aria-label="Search your saved knowledge base"
                  className="h-12 w-full rounded-lg border border-border bg-surface pl-11 pr-16 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring/50 focus:ring-[3px] focus:ring-ring/25"
                />
                {query ? (
                  <button
                    type="submit"
                    aria-label="Search"
                    className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
                  >
                    <ArrowUpRight className="size-4" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
                    ⌘K
                  </kbd>
                )}
              </div>
            </form>

            {/* Scope — subtle segmented / ghost control */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                Scope
              </span>
              <ScopeChip
                active={scope === ""}
                onClick={() => setScope("")}
                label="All sources"
              />
              {collections.slice(0, 5).map((c) => (
                <ScopeChip
                  key={c.id}
                  active={scope === c.id}
                  onClick={() => setScope(c.id)}
                  label={c.name}
                />
              ))}
            </div>

            {/* Results */}
            <div className="mt-5">
              {searching ? (
                <div className="space-y-4">
                  <AnswerSkeleton />
                  <div className="space-y-2">
                    <SourceCardSkeleton />
                    <SourceCardSkeleton />
                    <SourceCardSkeleton />
                  </div>
                </div>
              ) : hasSearched && (answer || sources.length > 0) ? (
                <div className="space-y-4">
                  {answer ? (
                    <AnswerBlock answer={answer} sources={sources} />
                  ) : null}
                  {sources.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-0.5">
                        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                          Sources
                        </span>
                        <span className="font-mono text-2xs text-muted-foreground/70">
                          {sources.length}
                        </span>
                      </div>
                      {sources.map((s) => (
                        <SourceCard
                          key={`${s.id}-${s.index}`}
                          source={s}
                          onToggleSave={toggleSaveSource}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : hasSearched ? (
                <div className="rounded-lg border border-border bg-surface px-5 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No sources above the relevance threshold
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try rephrasing, or widen the scope to all sources.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {/* ── Zone 2 · At-a-glance metrics ─────────────────────────── */}
          <section className="mb-12">
            <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {stats.map((s) => (
                <StatCard
                  key={s.label}
                  label={s.label}
                  value={s.value}
                  series={s.series}
                  hint={s.hint}
                  loading={loading}
                />
              ))}
            </div>
          </section>

          {/* ── Zone 3 · Weekly digest (the one accent CTA) ──────────── */}
          <section className="mb-12">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-5 py-4">
              <div className="flex items-start gap-3">
                <Newspaper className="mt-0.5 size-4 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Weekly digest
                  </p>
                  <p className="text-sm text-muted-foreground">
                    A synthesized summary of everything you saved this week.
                  </p>
                </div>
              </div>
              <Button
                variant="accent"
                onClick={loadWeeklyDigest}
                disabled={digestLoading}
                className="shrink-0"
              >
                {digestLoading ? "Generating…" : "Generate digest"}
              </Button>
            </div>

            {digest ? (
              <div className="mt-3 space-y-3 rounded-xl border border-border bg-surface p-5">
                <p className="text-sm leading-relaxed text-foreground/90">
                  {digest.summary}
                </p>
                <div className="space-y-2">
                  {digest.themes.map((t, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-surface-elevated/40 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {t.title}
                        </p>
                        <span className="font-mono text-2xs text-muted-foreground">
                          {t.note_ids.length} note
                          {t.note_ids.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* ── Zone 4a · Collections ────────────────────────────────── */}
          <section className="mb-12">
            <SectionHeader
              title="Collections"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingCollection((v) => !v)}
                >
                  <Plus className="size-4" />
                  New
                </Button>
              }
            />

            {addingCollection ? (
              <div className="mb-3 flex items-center gap-2">
                <input
                  autoFocus
                  value={newCollection}
                  onChange={(e) => setNewCollection(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createCollection()}
                  placeholder="Collection name"
                  className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring/50 focus:ring-[3px] focus:ring-ring/25"
                />
                <Button
                  size="sm"
                  onClick={createCollection}
                  disabled={creatingCollection || !newCollection.trim()}
                >
                  {creatingCollection ? "Creating…" : "Create"}
                </Button>
              </div>
            ) : null}

            {loading ? (
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-36 rounded-lg" />
                ))}
              </div>
            ) : collections.length === 0 ? (
              <TastefulEmpty
                icon={<FolderOpen className="size-5" />}
                title="No collections yet"
                copy="Group related notes into focused themes to search and revisit them together."
                cta={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAddingCollection(true)}
                  >
                    <FolderPlus className="size-4" />
                    New collection
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {collections.map((c) => (
                  <button
                    key={c.id}
                    className="group flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-muted-foreground/25 hover:bg-surface-elevated"
                  >
                    <FolderOpen className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    <span className="text-sm text-foreground">{c.name}</span>
                    <span className="font-mono text-2xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── Zone 4b · Recent notes ───────────────────────────────── */}
          <section className="mb-4">
            <SectionHeader
              title="Recent notes"
              action={
                notes.length > 5 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllNotes((v) => !v)}
                  >
                    {showAllNotes ? "Show recent" : "View all"}
                  </Button>
                ) : null
              }
            />

            {loading ? (
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2 px-4 py-3">
                    <Skeleton className="h-3.5 w-2/5" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                ))}
              </div>
            ) : notes.length === 0 ? (
              <TastefulEmpty
                icon={<FileText className="size-5" />}
                title="No notes yet"
                copy="Save a page with the browser extension and its summary, insights, and embeddings will appear here."
              />
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {visibleNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    collections={collections}
                    addedLabel={
                      recentlyAdded?.noteId === note.id
                        ? recentlyAdded.collectionName
                        : null
                    }
                    onLike={() => toggleLike(note)}
                    onDelete={() => deleteNote(note.id)}
                    onAddTo={(cid) => addNoteToCollection(note.id, cid)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/* ── Local presentational helpers ──────────────────────────────────────── */

function ScopeChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-border bg-surface-elevated text-foreground"
          : "border-transparent text-muted-foreground hover:bg-surface hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}

function TastefulEmpty({
  icon,
  title,
  copy,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-elevated text-muted-foreground">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">{copy}</p>
      </div>
      {cta ? <div className="pt-1">{cta}</div> : null}
    </div>
  );
}

function NoteRow({
  note,
  collections,
  addedLabel,
  onLike,
  onDelete,
  onAddTo,
}: {
  note: Note;
  collections: Collection[];
  addedLabel: string | null;
  onLike: () => void;
  onDelete: () => void;
  onAddTo: (collectionId: number) => void;
}) {
  return (
    <div className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-elevated/40">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={note.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm font-medium text-foreground transition-colors hover:text-accent"
          >
            {note.title || "Untitled"}
          </a>
          {note.liked ? (
            <Heart className="size-3 shrink-0 fill-accent text-accent" />
          ) : null}
          {addedLabel ? (
            <Badge variant="score" className="shrink-0">
              ↳ {addedLabel}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
          {note.summary}
        </p>
        <div className="mt-1.5 flex items-center gap-2 font-mono text-2xs text-muted-foreground">
          <span className="truncate">{note.domain || hostFrom(note.url)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="shrink-0">
            {new Date(note.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Row actions — revealed on hover */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <IconAction label={note.liked ? "Unlike" : "Like"} onClick={onLike}>
          <Heart
            className={cn("size-3.5", note.liked && "fill-accent text-accent")}
          />
        </IconAction>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Add to collection"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              <FolderPlus className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Add to collection</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {collections.length === 0 ? (
              <DropdownMenuItem disabled>No collections yet</DropdownMenuItem>
            ) : (
              collections.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => onAddTo(c.id)}>
                  {c.name}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <IconAction label="Delete" onClick={onDelete} destructive>
          <Trash2 className="size-3.5" />
        </IconAction>
      </div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground",
        destructive && "hover:text-destructive"
      )}
    >
      {children}
    </button>
  );
}
