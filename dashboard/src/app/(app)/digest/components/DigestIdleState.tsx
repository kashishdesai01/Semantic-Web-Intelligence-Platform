import { Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WeekStats, ClusterPreview } from "@/lib/types";
import { DigestStatStrip } from "./DigestStatStrip";
import { DigestClusterPreview } from "./DigestClusterPreview";

type Props = {
  weekStats: WeekStats;
  clusters: ClusterPreview[];
  loading: boolean;
  onGenerate: () => void;
};

export function DigestIdleState({ weekStats, clusters, loading, onGenerate }: Props) {
  return (
    <div className="space-y-4">
      <DigestStatStrip
        notesThisWeek={weekStats.notesThisWeek}
        topicsCount={weekStats.topicsCount}
        sourceCount={weekStats.sourceCount}
        loading={loading}
      />

      {!loading && clusters.length > 0 ? (
        <DigestClusterPreview clusters={clusters} />
      ) : null}

      <div className="rounded-xl border border-border bg-surface px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated">
            <Newspaper className="size-4 text-accent" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Ready to synthesize this week
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                Claude will read across your{" "}
                <span className="font-mono text-foreground">{weekStats.notesThisWeek}</span>{" "}
                notes and{" "}
                <span className="font-mono text-foreground">{weekStats.topicsCount}</span>{" "}
                clusters to produce a themed briefing with inline citations.
              </p>
            </div>
            <Button variant="accent" size="sm" onClick={onGenerate} disabled={loading}>
              {loading ? "Generating…" : "Generate this week's digest"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
