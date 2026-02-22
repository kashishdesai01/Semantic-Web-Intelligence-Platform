"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

type Totals = { total_notes: number; total_sources: number };
type NotesPerDay = { day: string; count: number };
type TopDomain = { domain: string; count: number };
type Note = {
  id: number;
  summary: string;
  key_insights: string[];
  created_at: string;
  url: string;
  title: string | null;
  domain: string | null;
  liked: boolean;
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [notesPerDay, setNotesPerDay] = useState<NotesPerDay[]>([]);
  const [topDomains, setTopDomains] = useState<TopDomain[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<"week" | "month" | "6months" | "year">(
    "month"
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAnalytics(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  async function loadAnalytics(selectedRange = range) {
    setLoading(true);
    try {
      const analytics = await apiFetch<{
        totals: Totals;
        notes_per_day: NotesPerDay[];
        top_domains: TopDomain[];
        recent_notes: Note[];
      }>(`/api/analytics/summary?range=${selectedRange}`);
      setTotals(analytics.totals);
      setNotesPerDay(analytics.notes_per_day || []);
      setTopDomains(analytics.top_domains || []);
      setRecentNotes(analytics.recent_notes || []);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  const maxNotesPerDay = useMemo(() => {
    return Math.max(1, ...notesPerDay.map((row) => Number(row.count) || 0));
  }, [notesPerDay]);

  const linePoints = useMemo(() => {
    if (notesPerDay.length === 0) return "";
    const width = 600;
    const height = 180;
    return notesPerDay
      .map((row, idx) => {
        const x =
          notesPerDay.length === 1
            ? width / 2
            : (idx / (notesPerDay.length - 1)) * width;
        const value = Number(row.count) || 0;
        const y = height - (value / maxNotesPerDay) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [notesPerDay, maxNotesPerDay]);

  const domainTotal = useMemo(() => {
    return topDomains.reduce((sum, row) => sum + Number(row.count || 0), 0);
  }, [topDomains]);

  const pieStops = useMemo(() => {
    if (topDomains.length === 0) return "transparent";
    let acc = 0;
    const colors = ["#7df9ff", "#ffc857", "#ff7b7b", "#9aff7b", "#7b9bff"];
    const segments = topDomains.slice(0, 5).map((row, index) => {
      const pct = domainTotal ? (Number(row.count) / domainTotal) * 100 : 0;
      const start = acc;
      acc += pct;
      return `${colors[index % colors.length]} ${start.toFixed(2)}% ${acc.toFixed(
        2
      )}%`;
    });
    if (acc < 100) {
      segments.push(`#2b2f44 ${acc.toFixed(2)}% 100%`);
    }
    return segments.join(", ");
  }, [topDomains, domainTotal]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="page">
      <div style={{ width: "min(1100px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1>Analytics</h1>
          <button className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>

        {error ? <p className="muted">{error}</p> : null}

        <div className="card-grid">
          <div className="card">
            <span className="muted">Total notes</span>
            <strong>{totals?.total_notes ?? 0}</strong>
          </div>
          <div className="card">
            <span className="muted">Total sources</span>
            <strong>{totals?.total_sources ?? 0}</strong>
          </div>
          <div className="card">
            <span className="muted">Recent notes</span>
            <strong>{recentNotes.length}</strong>
          </div>
        </div>

        <div className="panel">
          <h2>Most visited sites (top 5)</h2>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: `conic-gradient(${pieStops})`,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
            <div className="list" style={{ flex: 1, minWidth: 240 }}>
              {topDomains.length === 0 ? (
                <p className="muted">No domain data yet.</p>
              ) : (
                topDomains.slice(0, 5).map((row) => (
                  <div key={row.domain} className="note">
                    <strong>{row.domain}</strong>
                    <div className="note-meta">
                      <span>{row.count} notes</span>
                    </div>
                  </div>
                ))
              )}
              {topDomains.length > 5 ? (
                <p className="muted">+ {topDomains.length - 5} other sites</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>Reading time (estimated)</h2>
          <p className="muted">
            Estimated at 5 minutes per note. We can refine this later with scroll
            time from the extension.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {(["week", "month", "6months", "year"] as const).map((label) => (
              <button
                key={label}
                className={`btn ${range === label ? "primary" : "ghost"}`}
                onClick={() => setRange(label)}
                disabled={loading}
              >
                {label === "week"
                  ? "Week"
                  : label === "month"
                    ? "Month"
                    : label === "6months"
                      ? "6 months"
                      : "Year"}
              </button>
            ))}
          </div>
          {notesPerDay.length === 0 ? (
            <p className="muted">No reading data yet.</p>
          ) : (
            <div style={{ marginTop: 12 }}>
              <svg
                viewBox="0 0 600 180"
                width="100%"
                height="220"
                role="img"
                aria-label="Reading time line graph"
              >
                <polyline
                  fill="none"
                  stroke="#7df9ff"
                  strokeWidth="3"
                  points={linePoints}
                />
                <polyline
                  fill="none"
                  stroke="rgba(125,249,255,0.25)"
                  strokeWidth="8"
                  points={linePoints}
                  strokeLinecap="round"
                />
                {notesPerDay.map((row, idx) => {
                  const x =
                    notesPerDay.length === 1
                      ? 300
                      : (idx / (notesPerDay.length - 1)) * 600;
                  const value = Number(row.count) || 0;
                  const y = 180 - (value / maxNotesPerDay) * 180;
                  return (
                    <circle
                      key={row.day}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#ffc857"
                    />
                  );
                })}
              </svg>
              <div className="chart">
                {notesPerDay.map((row) => (
                  <div className="note-meta" key={row.day}>
                    <span>{new Date(row.day).toLocaleDateString()}</span>
                    <span>{Number(row.count) * 5} min</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Recent notes snapshot</h2>
          <div className="list">
            {recentNotes.length === 0 ? (
              <p className="muted">No notes yet.</p>
            ) : (
              recentNotes.map((note) => (
                <div key={note.id} className="note">
                  <p>{note.summary}</p>
                  <div className="note-meta">
                    <span>{note.title || "Untitled"}</span>
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                    <a href={note.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
