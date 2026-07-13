import * as React from "react";
import { Sparkles } from "lucide-react";
import type { DigestFull } from "@/lib/types";
import { DigestSectionBlock } from "./DigestSectionBlock";

function renderWithCitations(text: string | undefined): React.ReactNode[] {
  if (!text) return [];
  const nodes: React.ReactNode[] = [];
  const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));

    const nums = match[1]
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => n >= 1);

    if (nums.length === 0) {
      nodes.push(match[0]);
    } else {
      nodes.push(
        <sup key={`c-${key++}`} className="ml-0.5 inline-flex gap-0.5">
          {nums.map((n) => (
            <span
              key={n}
              className="rounded-sm px-0.5 font-mono text-[0.625rem] font-medium text-accent"
            >
              {n}
            </span>
          ))}
        </sup>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Props = {
  digest: DigestFull;
};

export function DigestBriefing({ digest }: Props) {
  return (
    <div className="space-y-8">
      {/* Dated header */}
      <div className="border-b border-border pb-5">
        <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
          Weekly briefing
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
          Week of {digest.weekRange}
        </h2>
      </div>

      {/* Synthesized overview */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-3.5 text-accent" />
          <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
            Overview
          </span>
        </div>
        <p className="text-[0.9375rem] leading-[1.75] text-foreground/90">
          {renderWithCitations(digest.overview)}
        </p>
      </div>

      {/* Themed sections */}
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
            Themes
          </span>
          <span className="font-mono text-2xs text-muted-foreground/60">
            {digest.sections.length}
          </span>
        </div>
        {digest.sections.map((section) => (
          <DigestSectionBlock key={section.cluster} section={section} />
        ))}
      </div>
    </div>
  );
}
