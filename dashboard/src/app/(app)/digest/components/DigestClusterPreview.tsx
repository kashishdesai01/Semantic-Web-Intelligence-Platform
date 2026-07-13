import { Sparkles } from "lucide-react";
import type { ClusterPreview } from "@/lib/types";

type Props = {
  clusters: ClusterPreview[];
};

export function DigestClusterPreview({ clusters }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Sparkles className="size-3 text-accent" />
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
          Clusters this week
        </span>
      </div>
      <div className="divide-y divide-border">
        {clusters.map((c) => (
          <div key={c.name} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-foreground">{c.name}</span>
            <span className="font-mono text-2xs text-muted-foreground">{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
