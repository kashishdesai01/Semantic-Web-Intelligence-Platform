import { Sparkline } from "./Sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number;
  series?: number[];
  hint?: string;
  loading?: boolean;
};

/**
 * Understated mono metric. Small label, large mono number, muted trend.
 * The zero state is styled on purpose (dimmed number + "—" trend), so an empty
 * account reads as intentional rather than broken.
 */
export function StatCard({ label, value, series, hint, loading }: StatCardProps) {
  const empty = value === 0;

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex items-end justify-between gap-3">
        {loading ? (
          <Skeleton className="h-8 w-14" />
        ) : (
          <span
            className={cn(
              "font-mono text-3xl leading-none tabular-nums",
              empty ? "text-muted-foreground/50" : "text-foreground"
            )}
          >
            {value.toLocaleString()}
          </span>
        )}
        {!loading && series && series.length > 1 ? (
          <Sparkline data={empty ? series.map(() => 0) : series} />
        ) : null}
      </div>
      {!loading ? (
        <p className="font-mono text-2xs text-muted-foreground">
          {empty ? "— nothing yet" : hint ?? " "}
        </p>
      ) : (
        <Skeleton className="h-3 w-16" />
      )}
    </div>
  );
}
