import { P } from "../lib";

type ChartTooltipProps = {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
};

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-border bg-surface-elevated px-3 py-2 shadow-lg"
      style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
    >
      <p className="mb-1.5 text-muted-foreground">{label}</p>
      {[...payload].reverse().map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto pl-4 tabular-nums text-foreground">
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export const tickStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fill: P.muted,
} as const;
