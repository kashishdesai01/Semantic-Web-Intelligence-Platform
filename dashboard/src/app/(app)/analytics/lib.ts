import type { AnalyticsMiniNote } from "@/lib/demo";

// Design-system token values used across analytics charts.
export const P = {
  accent:    "#6ee7b7",
  surface:   "#141416",
  surfaceEl: "#1c1c1f",
  muted:     "#8a8a94",
  border:    "#26262a",
  indigo:    "#818cf8",
  sky:       "#60a5fa",
  orange:    "#fb923c",
  slate:     "#94a3b8",
} as const;

export const CLUSTERS = [
  "LLM Inference",
  "Systems Design",
  "Vector Databases",
  "Startups",
  "Rust",
] as const;

export type Cluster = (typeof CLUSTERS)[number];

export const CLUSTER_COLOR: Record<Cluster, string> = {
  "LLM Inference":    P.accent,
  "Systems Design":   P.sky,
  "Vector Databases": P.indigo,
  "Startups":         P.slate,
  "Rust":             P.orange,
};

export type TimeRange = "week" | "month" | "6months" | "year";

export const RANGE_LABEL: Record<TimeRange, string> = {
  week: "Week",
  month: "Month",
  "6months": "6 months",
  year: "Year",
};

export function rangeStart(range: TimeRange): Date {
  const d = new Date();
  if (range === "week")    d.setDate(d.getDate() - 7);
  if (range === "month")   d.setMonth(d.getMonth() - 1);
  if (range === "6months") d.setMonth(d.getMonth() - 6);
  if (range === "year")    d.setFullYear(d.getFullYear() - 1);
  return d;
}

export function inRange(note: AnalyticsMiniNote, range: TimeRange) {
  return new Date(note.created_at) >= rangeStart(range);
}

export type TopicPoint = { label: string } & Record<Cluster, number>;

export function deriveTopicSeries(
  notes: AnalyticsMiniNote[],
  range: TimeRange
): TopicPoint[] {
  const start = rangeStart(range);
  const now = new Date();
  const bucketDays =
    range === "week" ? 1 :
    range === "month" ? 3 :
    range === "6months" ? 7 : 14;

  const bucketMs = bucketDays * 86_400_000;
  const totalMs = now.getTime() - start.getTime();
  const count = Math.ceil(totalMs / bucketMs);

  const buckets: TopicPoint[] = Array.from({ length: count }, (_, i) => {
    const d = new Date(start.getTime() + i * bucketMs);
    const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return {
      label,
      "LLM Inference": 0,
      "Systems Design": 0,
      "Vector Databases": 0,
      Startups: 0,
      Rust: 0,
    };
  });

  for (const n of notes) {
    const ms = new Date(n.created_at).getTime() - start.getTime();
    if (ms < 0) continue;
    const idx = Math.min(Math.floor(ms / bucketMs), buckets.length - 1);
    (buckets[idx] as Record<string, number>)[n.cluster]++;
  }

  return buckets;
}

export type DomainBar = { domain: string; count: number };

export function deriveDomainDist(notes: AnalyticsMiniNote[]): DomainBar[] {
  const m = new Map<string, number>();
  for (const n of notes) m.set(n.domain, (m.get(n.domain) ?? 0) + 1);
  return [...m.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);
}

export type HeatCell = { date: string; count: number; dow: number; week: number };

export function deriveHeatmap(
  notes: AnalyticsMiniNote[],
  range: TimeRange
): HeatCell[] {
  const start = rangeStart(range);
  const now = new Date();

  const countByDay = new Map<string, number>();
  for (const n of notes) {
    if (new Date(n.created_at) < start) continue;
    const key = n.created_at.slice(0, 10);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() - cursor.getDay());

  const cells: HeatCell[] = [];
  let week = 0;
  while (cursor <= now) {
    const dow = cursor.getDay();
    if (dow === 0 && cells.length > 0) week++;
    const date = cursor.toISOString().slice(0, 10);
    cells.push({ date, count: countByDay.get(date) ?? 0, dow, week });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

export type GapItem = { cluster: Cluster; count: number };

export function deriveGaps(notes: AnalyticsMiniNote[]): GapItem[] {
  const m = new Map<Cluster, number>(CLUSTERS.map((c) => [c, 0]));
  for (const n of notes) m.set(n.cluster as Cluster, (m.get(n.cluster as Cluster) ?? 0) + 1);
  return [...m.entries()]
    .map(([cluster, count]) => ({ cluster, count }))
    .filter(({ count }) => count < 28)
    .sort((a, b) => a.count - b.count);
}
