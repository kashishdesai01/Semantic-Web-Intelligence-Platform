import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type RailStatProps = {
  label: string;
  value: number | null;
  accent?: boolean;
};

export function RailStat({ label, value, accent }: RailStatProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {value === null ? (
        <Skeleton className="h-6 w-10" />
      ) : (
        <span
          className={cn(
            "font-mono text-2xl leading-none tabular-nums",
            accent && value > 0 ? "text-accent" : "text-foreground"
          )}
        >
          {value.toLocaleString()}
        </span>
      )}
    </div>
  );
}
