import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function DigestSkeleton() {
  return (
    <div className="space-y-8">
      {/* Dated header skeleton */}
      <div className="space-y-1.5 border-b border-border pb-5">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-6 w-52" />
      </div>

      {/* Overview skeleton */}
      <div className="animate-pulse rounded-xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-3.5 text-muted-foreground/40" />
          <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
            Synthesizing…
          </span>
        </div>
        <div className="space-y-2">
          <div className="h-3.5 w-full rounded bg-surface-elevated" />
          <div className="h-3.5 w-[95%] rounded bg-surface-elevated" />
          <div className="h-3.5 w-[98%] rounded bg-surface-elevated" />
          <div className="h-3.5 w-[90%] rounded bg-surface-elevated" />
          <div className="h-3.5 w-3/4 rounded bg-surface-elevated" />
        </div>
      </div>

      {/* Section shimmers */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-3.5 w-32 rounded bg-surface-elevated" />
            <div className="h-3 w-5 rounded bg-surface-elevated" />
            <div className="h-4 w-24 rounded bg-surface-elevated" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-surface-elevated" />
            <div className="h-3 w-4/5 rounded bg-surface-elevated" />
          </div>
          <div className="space-y-2">
            {[0, 1].map((j) => (
              <div
                key={j}
                className="rounded-lg border border-border bg-surface px-4 py-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="h-3.5 w-2/5 rounded bg-surface-elevated" />
                  <div className="h-4 w-10 rounded bg-surface-elevated" />
                </div>
                <div className="h-2.5 w-1/4 rounded bg-surface-elevated" />
                <div className="h-3 w-full rounded bg-surface-elevated" />
                <div className="h-3 w-3/4 rounded bg-surface-elevated" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
