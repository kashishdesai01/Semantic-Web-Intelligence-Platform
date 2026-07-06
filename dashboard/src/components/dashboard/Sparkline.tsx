import { cn } from "@/lib/utils";

type SparklineProps = {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
};

/**
 * Minimal trend line. Intentionally muted (never the accent) — the accent is
 * reserved for relevance scores, active state, citations and the primary CTA.
 * An all-zero / empty series renders a flat baseline so the "nothing yet" state
 * still looks deliberate.
 */
export function Sparkline({ data, className, width = 72, height = 24 }: SparklineProps) {
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : 0;

  const points = data.map((v, i) => {
    const x = pad + i * step;
    const y = pad + h - ((v - min) / span) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const flat = data.every((v) => v === data[0]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={cn("text-muted-foreground/60", className)}
      aria-hidden
    >
      <polyline
        points={points.join(" ")}
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={flat ? 0.4 : 1}
      />
    </svg>
  );
}
