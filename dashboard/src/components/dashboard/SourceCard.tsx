"use client";

import * as React from "react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ScoredSource = {
  id: number;
  /** 1-based citation index, matches the superscripts in the answer. */
  index: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  score?: number; // 0..1 relevance (omitted when unknown)
  insights?: string[];
  saved?: boolean;
};

function prettyPath(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${u.host}${path}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function SourceCard({
  source,
  onToggleSave,
}: {
  source: ScoredSource;
  onToggleSave?: (s: ScoredSource) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const insights = source.insights ?? [];

  return (
    <div
      id={`source-${source.index}`}
      className="scroll-mt-24 overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-muted-foreground/25"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Citation index — accent */}
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-accent/30 font-mono text-2xs text-accent">
          {source.index}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium text-foreground">
              {source.title}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {typeof source.score === "number" ? (
                <Badge variant="score" title="Relevance score">
                  {source.score.toFixed(2)}
                </Badge>
              ) : null}
              <button
                onClick={() => onToggleSave?.(source)}
                aria-pressed={source.saved}
                aria-label={source.saved ? "Remove bookmark" : "Save source"}
                className={cn(
                  "flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground",
                  source.saved && "text-accent hover:text-accent"
                )}
              >
                {source.saved ? (
                  <BookmarkCheck className="size-3.5" />
                ) : (
                  <Bookmark className="size-3.5" />
                )}
              </button>
            </div>
          </div>

          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex max-w-full items-center gap-1 font-mono text-2xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="truncate">{prettyPath(source.url)}</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {source.snippet}
          </p>

          {insights.length > 0 ? (
            <button
              onClick={() => setOpen((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  "size-3 transition-transform",
                  open && "rotate-180"
                )}
              />
              {open ? "Hide highlights" : `${insights.length} highlights`}
            </button>
          ) : null}
        </div>
      </div>

      {open && insights.length > 0 ? (
        <ul className="space-y-1.5 border-t border-border bg-surface-elevated/40 px-4 py-3 pl-12">
          {insights.map((it, i) => (
            <li
              key={i}
              className="relative pl-3 text-sm leading-relaxed text-muted-foreground before:absolute before:left-0 before:top-2 before:size-1 before:rounded-full before:bg-muted-foreground/50"
            >
              {it}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SourceCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 size-5 shrink-0 rounded border border-border bg-surface-elevated" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="h-3.5 w-2/5 rounded bg-surface-elevated" />
            <div className="h-4 w-10 rounded bg-surface-elevated" />
          </div>
          <div className="h-2.5 w-1/3 rounded bg-surface-elevated" />
          <div className="h-3 w-full rounded bg-surface-elevated" />
          <div className="h-3 w-4/5 rounded bg-surface-elevated" />
        </div>
      </div>
    </div>
  );
}
