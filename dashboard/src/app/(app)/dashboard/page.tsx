"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  FileText,
  FolderOpen,
  FolderPlus,
  Plus,
  Search as SearchIcon,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { pollJob } from "@/lib/jobs";
import { shortDate } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  SourceCard,
  SourceCardSkeleton,
  type ScoredSource,
} from "@/components/dashboard/SourceCard";
import {
  AnswerBlock,
  AnswerSkeleton,
} from "@/components/dashboard/AnswerBlock";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
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
import { PageEmpty } from "@/components/shared/PageEmpty";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ScopeChip } from "@/components/shared/ScopeChip";
import { DemoToggle } from "@/components/shared/DemoToggle";
import { NoteRow } from "./components/NoteRow";
import { WeeklyDigestPanel } from "./components/WeeklyDigestPanel";
import { JumpBackInPanel } from "./components/JumpBackInPanel";

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

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<number | "">("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<ScoredSource[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const [newCollection, setNewCollection] = useState("");
  const [addingCollection, setAddingCollection] = useState(false);
  const [creatingCollection, setCreatingCollection] = useState(false);

  const [showAllNotes, setShowAllNotes] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<{
    noteId: number;
    collectionName: string;
  } | null>(null);

  const [digest, setDigest] = useState<Digest | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);

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
    setAnswer(null);
    setSources([]);
    setHasSearched(false);
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
    if (demo) {
      setSearching(true);
      setHasSearched(true);
      setAnswer(null);
      setSources([]);
      window.setTimeout(() => {
        setAnswer(DEMO_ANSWER);
        setSources(DEMO_SOURCES);
        setSearching(false);
      }, 650);
      return;
    }
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

  function clearSearch() {
    setSearching(false);
    setHasSearched(false);
    setAnswer(null);
    setSources([]);
    if (!demo) setQuery("");
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
    } catch {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, liked: wasLiked } : n))
      );
      toast.error("Failed to update like");
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

  const visibleNotes = showAllNotes ? notes : notes.slice(0, 5);
  const isSearchActive = searching || hasSearched;
  const pinned = notes.filter((n) => n.liked).slice(0, 4);
  const stats: { label: string; value: number; series?: number[] }[] = [
    {
      label: "Notes",
      value: totals?.total_notes ?? 0,
      series: demo ? DEMO_SERIES.notes : undefined,
    },
    {
      label: "Sources",
      value: totals?.total_sources ?? 0,
      series: demo ? DEMO_SERIES.sources : undefined,
    },
    {
      label: "Collections",
      value: collections.length,
      series: demo ? DEMO_SERIES.collections : undefined,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-12">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Home
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search and synthesize across everything you&apos;ve saved.
          </p>
        </div>
        <DemoToggle active={demo} onToggle={() => (demo ? disableDemo() : enableDemo())} />
      </div>

      {error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={loadAll} />
        </div>
      ) : null}

      {/* Stats strip */}
      <div className="mt-6 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            compact
            label={s.label}
            value={s.value}
            series={s.series}
            loading={loading}
          />
        ))}
      </div>

      {/* Search bar */}
      <form onSubmit={runSearch} className="mt-6">
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
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
      </form>

      {/* Two-column workspace */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main column */}
        <div className="min-w-0 space-y-8">
          {isSearchActive ? (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                  {searching ? "Searching" : "Results"}
                </h2>
                <Button variant="ghost" size="sm" onClick={clearSearch}>
                  <X className="size-4" />
                  Clear
                </Button>
              </div>

              {searching ? (
                <div className="space-y-4">
                  <AnswerSkeleton />
                  <div className="space-y-2">
                    <SourceCardSkeleton />
                    <SourceCardSkeleton />
                    <SourceCardSkeleton />
                  </div>
                </div>
              ) : answer || sources.length > 0 ? (
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
              ) : (
                <div className="rounded-lg border border-border bg-surface px-5 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No sources above the relevance threshold
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try rephrasing, or widen the scope to all sources.
                  </p>
                </div>
              )}
            </section>
          ) : (
            <>
              {/* Recent notes */}
              <section>
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
                  <PageEmpty
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

              {/* Collections mini section */}
              <section>
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
                      onKeyDown={(e) =>
                        e.key === "Enter" && createCollection()
                      }
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
                  <PageEmpty
                    icon={<FolderOpen className="size-5" />}
                    title="No collections yet"
                    copy="Group related notes into focused themes to search and revisit them together."
                    action={
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
                          {shortDate(c.created_at)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          <WeeklyDigestPanel
            digest={digest}
            loading={digestLoading}
            onGenerate={loadWeeklyDigest}
          />
          <JumpBackInPanel
            loading={loading}
            pinned={pinned}
            collections={collections}
          />
        </aside>
      </div>
    </div>
  );
}
