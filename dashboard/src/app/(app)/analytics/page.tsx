"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/lib/useRequireAuth";
import {
  DEMO_ANALYTICS_NOTES,
  DEMO_COLLECTIONS,
  DEMO_TOTALS,
  DEMO_SERIES,
} from "@/lib/demo";
import type { Totals } from "@/lib/types";
import { DemoToggle } from "@/components/shared/DemoToggle";
import {
  P,
  CLUSTERS,
  CLUSTER_COLOR,
  RANGE_LABEL,
  inRange,
  deriveTopicSeries,
  deriveDomainDist,
  deriveHeatmap,
  deriveGaps,
  type TimeRange,
  type Cluster,
  type DomainBar,
} from "./lib";
import { ChartEmpty } from "./components/ChartEmpty";
import { ChartTooltip, tickStyle } from "./components/ChartTooltip";
import { Heatmap } from "./components/Heatmap";

export default function AnalyticsPage() {
  useRequireAuth();

  const [demo, setDemo] = useState(false);
  const [range, setRange] = useState<TimeRange>("6months");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<Cluster | null>(null);

  const [totals, setTotals] = useState<Totals | null>(null);
  const [apiDomains, setApiDomains] = useState<DomainBar[]>([]);
  const [apiNotesPerDay, setApiNotesPerDay] = useState<{ day: string; count: number }[]>([]);
  const [collectionsCount, setCollectionsCount] = useState(0);

  useEffect(() => {
    const isDemo =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1";
    if (isDemo) {
      setDemo(true);
      setLoading(false);
    } else {
      loadApiData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!demo) loadApiData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  async function loadApiData() {
    setLoading(true);
    setError(null);
    try {
      const [analytics, cols] = await Promise.all([
        apiFetch<{
          totals: Totals;
          notes_per_day: { day: string; count: number }[];
          top_domains: { domain: string; count: number }[];
        }>(`/api/analytics/summary?range=${range}`),
        apiFetch<{ collections: { id: number }[] }>("/api/collections"),
      ]);
      setTotals(analytics.totals);
      setApiNotesPerDay(analytics.notes_per_day ?? []);
      setApiDomains(analytics.top_domains ?? []);
      setCollectionsCount((cols.collections ?? []).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  function enableDemo() {
    setDemo(true);
    setError(null);
    setLoading(false);
  }

  function disableDemo() {
    setDemo(false);
    loadApiData();
  }

  const filteredNotes = useMemo(
    () => (demo ? DEMO_ANALYTICS_NOTES.filter((n) => inRange(n, range)) : []),
    [demo, range]
  );

  const topicData = useMemo(
    () => deriveTopicSeries(demo ? DEMO_ANALYTICS_NOTES : [], range),
    [demo, range]
  );

  const domainData = useMemo(
    () => (demo ? deriveDomainDist(filteredNotes) : apiDomains),
    [demo, filteredNotes, apiDomains]
  );

  const heatData = useMemo(
    () => deriveHeatmap(demo ? DEMO_ANALYTICS_NOTES : [], range),
    [demo, range]
  );

  const gapItems = useMemo(
    () => (demo ? deriveGaps(DEMO_ANALYTICS_NOTES) : []),
    [demo]
  );

  const totalNotes   = demo ? DEMO_TOTALS.total_notes   : (totals?.total_notes ?? 0);
  const totalSources = demo ? DEMO_TOTALS.total_sources : (totals?.total_sources ?? 0);
  const totalCols    = demo ? DEMO_COLLECTIONS.length   : collectionsCount;
  const periodNotes  = demo
    ? filteredNotes.length
    : apiNotesPerDay.reduce((s, d) => s + Number(d.count), 0);

  const topicHasData = topicData.some((p) =>
    CLUSTERS.some((c) => (p as Record<string, number>)[c] > 0)
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How your knowledge base is growing and where the gaps are.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Time-range selector */}
          <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
            {(["week", "month", "6months", "year"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-3 py-1 font-mono text-xs transition-colors",
                  range === r
                    ? "bg-surface-elevated text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
          <DemoToggle active={demo} onToggle={() => (demo ? disableDemo() : enableDemo())} />
        </div>
      </div>

      {error ? (
        <p className="mt-6 font-mono text-xs text-destructive">{error}</p>
      ) : null}

      {/* Stat strip */}
      <div className="mt-6 grid grid-cols-4 divide-x divide-border overflow-hidden rounded-xl border border-border bg-surface">
        <StatCard compact label="Total notes"  value={totalNotes}   series={demo ? DEMO_SERIES.notes : undefined}       loading={loading} />
        <StatCard compact label="Sources"      value={totalSources} series={demo ? DEMO_SERIES.sources : undefined}     loading={loading} />
        <StatCard compact label="Collections"  value={totalCols}    series={demo ? DEMO_SERIES.collections : undefined} loading={loading} />
        <StatCard compact label="This period"  value={periodNotes}  loading={loading} />
      </div>

      {/* Chart grid */}
      <div className="mt-4 grid grid-cols-12 gap-4">

        {/* Topic composition */}
        <div className="col-span-12 rounded-xl border border-border bg-surface p-5 lg:col-span-8">
          <div className="mb-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
            Topic composition over time
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Note volume by semantic cluster across the selected period.
          </p>

          {loading ? (
            <Skeleton className="h-52 w-full rounded-lg" />
          ) : !topicHasData ? (
            <ChartEmpty
              message="Save at least 5 notes across different topics to see how your interests are distributed."
              height={208}
            />
          ) : (
            <ResponsiveContainer width="100%" height={208}>
              <AreaChart data={topicData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false} />
                <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: P.border, strokeWidth: 1 }} />
                {CLUSTERS.map((cluster) => {
                  const dimmed = hoveredCluster !== null && hoveredCluster !== cluster;
                  return (
                    <Area
                      key={cluster}
                      type="monotone"
                      dataKey={cluster}
                      stackId="s"
                      fill={CLUSTER_COLOR[cluster]}
                      stroke={CLUSTER_COLOR[cluster]}
                      fillOpacity={dimmed ? 0.18 : 0.82}
                      strokeOpacity={0}
                      strokeWidth={0}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {[...CLUSTERS].reverse().map((c) => (
              <button
                key={c}
                type="button"
                onMouseEnter={() => setHoveredCluster(c)}
                onMouseLeave={() => setHoveredCluster(null)}
                className="flex items-center gap-1.5 transition-opacity"
                style={{ opacity: hoveredCluster && hoveredCluster !== c ? 0.35 : 1 }}
              >
                <span className="size-2 rounded-sm" style={{ background: CLUSTER_COLOR[c] }} />
                <span className="font-mono text-2xs text-muted-foreground">{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Source distribution */}
        <div className="col-span-12 rounded-xl border border-border bg-surface p-5 lg:col-span-4">
          <div className="mb-4 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
            Source distribution
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-5 w-full rounded" />)}
            </div>
          ) : domainData.length === 0 ? (
            <ChartEmpty message="No sources saved yet." height={232} />
          ) : (
            <ResponsiveContainer width="100%" height={232}>
              <BarChart data={domainData.slice(0, 7)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={tickStyle} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="domain" width={90} tick={tickStyle} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div
                        className="rounded-lg border border-border bg-surface-elevated px-3 py-1.5 shadow-lg"
                        style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
                      >
                        <span className="tabular-nums text-foreground">
                          {payload[0].value} notes
                        </span>
                      </div>
                    ) : null
                  }
                  cursor={{ fill: P.border, fillOpacity: 0.4 }}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {domainData.slice(0, 7).map((_, i) => (
                    <Cell key={i} fill={P.accent} fillOpacity={1 - i * 0.1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity heatmap */}
        <div className="col-span-12 rounded-xl border border-border bg-surface p-5 lg:col-span-8">
          <div className="mb-4 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
            Saving activity
          </div>
          {loading ? (
            <Skeleton className="h-28 w-full rounded-lg" />
          ) : (
            <Heatmap cells={heatData} />
          )}
        </div>

        {/* Coverage & gaps */}
        <div className="col-span-12 rounded-xl border border-border bg-surface p-5 lg:col-span-4">
          <div className="mb-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
            Coverage &amp; gaps
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Clusters with thin coverage — opportunities to grow.
          </p>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : !demo ? (
            <ChartEmpty message="Enable demo data to see coverage analysis." height={160} />
          ) : gapItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">All topics have solid coverage.</p>
          ) : (
            <div className="space-y-2">
              {gapItems.map(({ cluster, count }) => (
                <div key={cluster} className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="mt-0.5 size-2 shrink-0 rounded-sm"
                        style={{ background: CLUSTER_COLOR[cluster] }}
                      />
                      <p className="text-sm font-medium text-foreground">{cluster}</p>
                    </div>
                    <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                      {count} notes
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-2xs text-muted-foreground">
                    {count === 0 ? "No notes yet — start here" : "Thin coverage — opportunity to grow"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
