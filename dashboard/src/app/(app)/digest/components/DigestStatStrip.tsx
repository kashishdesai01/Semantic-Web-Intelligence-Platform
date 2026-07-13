import { StatCard } from "@/components/dashboard/StatCard";
import type { WeekStats } from "@/lib/types";

type Props = WeekStats & { loading?: boolean };

export function DigestStatStrip({ notesThisWeek, topicsCount, sourceCount, loading }: Props) {
  const stats = [
    { label: "Notes this week", value: notesThisWeek },
    { label: "Topics", value: topicsCount },
    { label: "Sources", value: sourceCount },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {stats.map((s) => (
        <StatCard key={s.label} compact label={s.label} value={s.value} loading={loading} />
      ))}
    </div>
  );
}
