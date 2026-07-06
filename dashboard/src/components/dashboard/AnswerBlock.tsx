import * as React from "react";
import { Sparkles } from "lucide-react";
import type { ScoredSource } from "./SourceCard";

/**
 * Renders a synthesized answer where inline `[n]` markers become mono accent
 * superscripts that link to the matching source card. Unknown / malformed
 * markers are left as plain text so a stray bracket never breaks the prose.
 */
function renderWithCitations(text: string, maxIndex: number) {
  const nodes: React.ReactNode[] = [];
  const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const nums = match[1]
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => n >= 1 && n <= maxIndex);

    if (nums.length === 0) {
      nodes.push(match[0]); // leave malformed marker verbatim
    } else {
      nodes.push(
        <sup key={`c-${key++}`} className="ml-0.5 inline-flex gap-0.5">
          {nums.map((n) => (
            <a
              key={n}
              href={`#source-${n}`}
              className="rounded-sm px-0.5 font-mono text-[0.625rem] font-medium text-accent underline-offset-2 transition-colors hover:bg-accent/10 hover:underline"
            >
              {n}
            </a>
          ))}
        </sup>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function AnswerBlock({
  answer,
  sources,
}: {
  answer: string;
  sources: ScoredSource[];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-3.5 text-accent" />
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
          Synthesized answer
        </span>
      </div>
      <div className="text-sm leading-relaxed text-foreground/90">
        {renderWithCitations(answer, sources.length)}
      </div>
    </div>
  );
}

export function AnswerSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-3.5 text-muted-foreground/50" />
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
          Synthesizing…
        </span>
      </div>
      <div className="animate-pulse space-y-2">
        <div className="h-3.5 w-full rounded bg-surface-elevated" />
        <div className="h-3.5 w-[92%] rounded bg-surface-elevated" />
        <div className="h-3.5 w-[97%] rounded bg-surface-elevated" />
        <div className="h-3.5 w-3/4 rounded bg-surface-elevated" />
      </div>
    </div>
  );
}
