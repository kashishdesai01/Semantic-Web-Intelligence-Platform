"use client";

import { Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";

type DigestTheme = {
  title: string;
  summary: string;
  note_ids: number[];
};

type Digest = {
  summary: string;
  themes: DigestTheme[];
};

type WeeklyDigestPanelProps = {
  digest: Digest | null;
  loading: boolean;
  onGenerate: () => void;
};

export function WeeklyDigestPanel({
  digest,
  loading,
  onGenerate,
}: WeeklyDigestPanelProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Newspaper className="size-4 shrink-0 text-accent" />
        <p className="text-sm font-medium text-foreground">Weekly digest</p>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        A synthesized summary of everything you saved this week.
      </p>
      <Button
        variant="accent"
        size="sm"
        className="w-full"
        onClick={onGenerate}
        disabled={loading}
      >
        {loading ? "Generating…" : "Generate digest"}
      </Button>

      {digest ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            {digest.summary}
          </p>
          {digest.themes.map((t, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {t.title}
                </p>
                <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                  {t.note_ids.length}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {t.summary}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
