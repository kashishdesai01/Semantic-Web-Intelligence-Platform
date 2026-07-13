"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MessagesSquare } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { hostFrom, shortDate } from "@/lib/format";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  AnswerBlock,
  AnswerSkeleton,
} from "@/components/dashboard/AnswerBlock";
import {
  SourceCard,
  SourceCardSkeleton,
  type ScoredSource,
} from "@/components/dashboard/SourceCard";
import { ScopeChip } from "@/components/shared/ScopeChip";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { DemoToggle } from "@/components/shared/DemoToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Citation, Collection, QaItem } from "@/lib/types";
import {
  DEMO_ANSWER,
  DEMO_COLLECTIONS,
  DEMO_SOURCES,
} from "@/lib/demo";

// ── Types ──────────────────────────────────────────────────────────────────────

type Turn = {
  id: string;
  question: string;
  answer: string | null;
  sources: ScoredSource[];
  loading: boolean;
  error?: string;
};

// ── Demo fixtures ──────────────────────────────────────────────────────────────

const DEMO_HISTORY: QaItem[] = [
  {
    id: 1,
    question: "How does speculative decoding speed up LLM inference?",
    answer: DEMO_ANSWER,
    answer_with_citations: DEMO_ANSWER,
    citations: DEMO_SOURCES.map((s) => ({
      note_id: s.id,
      title: s.title,
      url: s.url,
      highlights: s.insights ?? [],
    })),
    created_at: "2026-07-09T10:30:00Z",
  },
  {
    id: 2,
    question: "What are the key differences between HNSW and IVFFlat in pgvector?",
    answer:
      "HNSW provides better recall at query time while IVFFlat builds faster. For most workloads HNSW is preferred unless index-build time is the bottleneck [1].",
    answer_with_citations: null,
    citations: [],
    created_at: "2026-07-08T14:20:00Z",
  },
  {
    id: 3,
    question: "How did Discord migrate from Cassandra to ScyllaDB?",
    answer:
      "Discord migrated to ScyllaDB and added a Rust data-services layer to address tail latencies and hot-partition issues at trillion-row scale [1]. Request coalescing was the key technique to prevent stampedes.",
    answer_with_citations: null,
    citations: [],
    created_at: "2026-07-07T09:15:00Z",
  },
];

const DEMO_THREAD: Turn[] = [
  {
    id: "demo-1",
    question: "How does speculative decoding speed up LLM inference?",
    answer: DEMO_ANSWER,
    sources: DEMO_SOURCES,
    loading: false,
  },
];

// ── Starter suggestions shown in the idle empty state ─────────────────────────

const STARTERS = [
  "What did I save about speculative decoding?",
  "Summarize my Vector Databases notes",
  "Key insights from my Systems Design reading",
  "What topics have I been researching lately?",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function citationsToSources(citations: Citation[]): ScoredSource[] {
  return citations.map((c, i) => ({
    id: c.note_id,
    index: i + 1,
    title: c.title || "Untitled",
    url: c.url,
    domain: hostFrom(c.url),
    snippet: c.highlights?.[0] ?? "",
    insights: c.highlights?.slice(1),
  }));
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AskPage() {
  useRequireAuth();

  const [thread, setThread] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<number | "">("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [history, setHistory] = useState<QaItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [demo, setDemo] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDemo =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1";
    if (isDemo) enableDemo();
    else {
      loadCollections();
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (thread.length > 0) {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [thread]);

  async function loadCollections() {
    try {
      const res = await apiFetch<{ collections: Collection[] }>("/api/collections");
      setCollections(res.collections || []);
    } catch {
      /* scope pills silently absent */
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await apiFetch<{ items: QaItem[] }>("/api/qa?limit=20");
      setHistory(res.items || []);
    } catch {
      /* rail just shows empty */
    } finally {
      setHistoryLoading(false);
    }
  }

  function enableDemo() {
    setDemo(true);
    setCollections(DEMO_COLLECTIONS);
    setHistory(DEMO_HISTORY);
    setThread(DEMO_THREAD);
    setHistoryLoading(false);
  }

  function disableDemo() {
    setDemo(false);
    setThread([]);
    setInput("");
    setScope("");
    loadCollections();
    loadHistory();
  }

  async function submit(e?: React.FormEvent<HTMLFormElement>) {
    if (e) e.preventDefault();
    const question = input.trim();
    if (!question) return;
    setInput("");

    const id = String(Date.now());
    setThread((prev) => [
      ...prev,
      { id, question, answer: null, sources: [], loading: true },
    ]);

    if (demo) {
      window.setTimeout(() => {
        setThread((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, loading: false, answer: DEMO_ANSWER, sources: DEMO_SOURCES }
              : t
          )
        );
      }, 700);
      return;
    }

    try {
      const res = await apiFetch<{
        answer: string;
        citations: Citation[];
        answer_with_citations?: string;
      }>("/api/ask", {
        method: "POST",
        body: JSON.stringify({
          question,
          ...(scope ? { collection_id: scope } : {}),
        }),
      });

      const answerText = res.answer_with_citations || res.answer;
      const sources = citationsToSources(res.citations || []);

      setThread((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, loading: false, answer: answerText, sources } : t
        )
      );

      // Persist best-effort; reload rail on success
      apiFetch("/api/qa", {
        method: "POST",
        body: JSON.stringify({
          question,
          answer: res.answer,
          answer_with_citations: res.answer_with_citations || null,
          citations: res.citations || [],
        }),
      })
        .then(() => loadHistory())
        .catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to answer";
      setThread((prev) =>
        prev.map((t) => (t.id === id ? { ...t, loading: false, error: message } : t))
      );
    }
  }

  function reloadFromHistory(item: QaItem) {
    const sources = citationsToSources(item.citations || []);
    setThread([
      {
        id: `history-${item.id}`,
        question: item.question,
        answer: item.answer_with_citations || item.answer,
        sources,
        loading: false,
      },
    ]);
    setInput("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  function toggleSaveSource(turnId: string, s: ScoredSource) {
    setThread((prev) =>
      prev.map((t) =>
        t.id === turnId
          ? {
              ...t,
              sources: t.sources.map((x) =>
                x.id === s.id ? { ...x, saved: !x.saved } : x
              ),
            }
          : t
      )
    );
  }

  const isIdle = thread.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-12">
      {/* ── Page header ── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Ask
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Synthesized answers with inline citations, drawn from everything
            you&apos;ve saved.
          </p>
        </div>
        <DemoToggle
          active={demo}
          onToggle={() => (demo ? disableDemo() : enableDemo())}
        />
      </div>

      {/* ── Two-column workspace ── */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ── Main column ── */}
        <div className="min-w-0 space-y-6">
          {/* Composer */}
          <form onSubmit={submit}>
            <div className="relative">
              <MessagesSquare className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isIdle ? "Ask your knowledge base…" : "Ask a follow-up…"}
                aria-label="Ask a question"
                className="h-12 w-full rounded-lg border border-border bg-surface pl-11 pr-28 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring/50 focus:ring-[3px] focus:ring-ring/25"
              />
              <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                {input.trim() ? (
                  <Button type="submit" size="sm" className="h-7 gap-1 px-2.5 text-xs">
                    Ask
                    <ArrowUpRight className="size-3" />
                  </Button>
                ) : (
                  <kbd className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
                    ⌘↩
                  </kbd>
                )}
              </div>
            </div>

            {/* Scope pills */}
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

          {/* Thread or idle empty state */}
          {isIdle ? (
            <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-surface px-8 py-12 text-center">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-elevated text-muted-foreground">
                <MessagesSquare className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Ask your knowledge base anything
                </p>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Semantic search across everything you&apos;ve saved, synthesized
                  into a cited answer.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTERS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-muted-foreground/25 hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {thread.map((turn) => (
                <ThreadTurn
                  key={turn.id}
                  turn={turn}
                  onToggleSave={(s) => toggleSaveSource(turn.id, s)}
                />
              ))}
              <div ref={threadEndRef} />
            </div>
          )}
        </div>

        {/* ── Right rail — Q&A history ── */}
        <aside className="space-y-6">
          <section>
            <SectionHeader title="History" />
            {historyLoading ? (
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse space-y-1.5 px-4 py-3"
                  >
                    <div className="h-3 w-4/5 rounded bg-surface-elevated" />
                    <div className="h-3 w-3/5 rounded bg-surface-elevated" />
                    <div className="h-2.5 w-1/3 rounded bg-surface-elevated" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No past questions yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => reloadFromHistory(item)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-surface-elevated",
                      thread[0]?.id === `history-${item.id}` &&
                        "bg-surface-elevated"
                    )}
                  >
                    <p className="line-clamp-2 text-sm text-foreground">
                      {item.question}
                    </p>
                    <p className="mt-1 font-mono text-2xs text-muted-foreground">
                      {shortDate(item.created_at)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

// ── ThreadTurn ─────────────────────────────────────────────────────────────────

function ThreadTurn({
  turn,
  onToggleSave,
}: {
  turn: Turn;
  onToggleSave: (s: ScoredSource) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Question bubble — right-aligned */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-tr-sm border border-border bg-surface-elevated px-4 py-2.5">
          <p className="text-sm text-foreground">{turn.question}</p>
        </div>
      </div>

      {/* Answer + sources */}
      {turn.loading ? (
        <div className="space-y-2">
          <AnswerSkeleton />
          <SourceCardSkeleton />
          <SourceCardSkeleton />
        </div>
      ) : turn.error ? (
        <div className="rounded-xl border border-border bg-surface px-5 py-4">
          <p className="text-sm text-destructive">{turn.error}</p>
        </div>
      ) : turn.answer ? (
        <div className="space-y-3">
          <AnswerBlock answer={turn.answer} sources={turn.sources} />
          {turn.sources.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                  Sources
                </span>
                <span className="font-mono text-2xs text-muted-foreground/70">
                  {turn.sources.length}
                </span>
              </div>
              {turn.sources.map((s) => (
                <SourceCard
                  key={`${s.id}-${s.index}`}
                  source={s}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
