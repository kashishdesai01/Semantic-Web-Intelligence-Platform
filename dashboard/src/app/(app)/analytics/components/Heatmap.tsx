import { P } from "../lib";
import type { HeatCell } from "../lib";
import { ChartEmpty } from "./ChartEmpty";

type HeatmapProps = {
  cells: HeatCell[];
};

export function Heatmap({ cells }: HeatmapProps) {
  if (cells.length === 0) {
    return <ChartEmpty message="No activity in this period." height={100} />;
  }

  const maxCount = Math.max(...cells.map((c) => c.count), 1);
  const CELL = 11;
  const GAP = 2;
  const LABEL_W = 20;
  const HEADER_H = 14;
  const numWeeks = Math.max(...cells.map((c) => c.week)) + 1;

  const monthLabels: { label: string; week: number }[] = [];
  let lastMonth = -1;
  for (const c of cells) {
    const m = new Date(c.date).getUTCMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        label: new Date(c.date).toLocaleDateString(undefined, { month: "short" }),
        week: c.week,
      });
      lastMonth = m;
    }
  }

  const svgW = LABEL_W + numWeeks * (CELL + GAP);
  const svgH = HEADER_H + 7 * (CELL + GAP);
  const DAY_LABELS = ["", "M", "", "W", "", "F", ""];

  return (
    <div className="overflow-x-auto">
      <svg width={svgW} height={svgH} aria-label="Saving activity heatmap">
        {monthLabels.map((ml) => (
          <text
            key={ml.week}
            x={LABEL_W + ml.week * (CELL + GAP)}
            y={HEADER_H - 2}
            fontFamily="var(--font-mono)"
            fontSize={9}
            fill={P.muted}
          >
            {ml.label}
          </text>
        ))}
        {DAY_LABELS.map((d, i) =>
          d ? (
            <text
              key={i}
              x={LABEL_W - 4}
              y={HEADER_H + i * (CELL + GAP) + CELL * 0.75}
              fontFamily="var(--font-mono)"
              fontSize={8}
              fill={P.muted}
              textAnchor="end"
            >
              {d}
            </text>
          ) : null
        )}
        {cells.map((c) => {
          const alpha = c.count === 0 ? 0 : 0.15 + (c.count / maxCount) * 0.85;
          return (
            <rect
              key={c.date}
              x={LABEL_W + c.week * (CELL + GAP)}
              y={HEADER_H + c.dow * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={
                c.count === 0
                  ? P.border
                  : `rgba(110,231,183,${alpha.toFixed(2)})`
              }
            >
              <title>
                {c.date}: {c.count} note{c.count !== 1 ? "s" : ""}
              </title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="font-mono text-2xs text-muted-foreground">Less</span>
        {[0, 0.2, 0.45, 0.7, 1].map((a) => (
          <span
            key={a}
            className="size-2.5 rounded-sm"
            style={{
              background:
                a === 0 ? P.border : `rgba(110,231,183,${a})`,
            }}
          />
        ))}
        <span className="font-mono text-2xs text-muted-foreground">More</span>
      </div>
    </div>
  );
}
