"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { pollJob } from "@/lib/jobs";
import PageShell from "@/components/layout/PageShell";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Recommendation = { title: string; reason: string; note_ids: number[] };

export default function RecommendationsPage() {
  useRequireAuth();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => () => pollCancelRef.current?.(), []);

  async function loadRecommendations() {
    setLoading(true);
    setError(null);
    pollCancelRef.current?.();
    try {
      const res = await apiFetch<any>("/api/recommendations");
      if (res?.status === "queued") {
        pollCancelRef.current = pollJob<{ recommendations: Recommendation[] }>(
          apiFetch,
          res.job_id,
          (result) => setItems(result.recommendations || []),
          (message) => setError(message)
        );
      } else {
        setItems(res.recommendations || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell title="Recommendations">
      {error ? <p className="muted">{error}</p> : null}

      <div className="panel">
        <button
          className="btn primary"
          onClick={loadRecommendations}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate recommendations"}
        </button>
      </div>

      <div className="panel">
        <h2>What to read next</h2>
        <div className="list">
          {items.length === 0 ? (
            <p className="muted">No recommendations yet.</p>
          ) : (
            items.map((rec, idx) => (
              <div key={idx} className="note">
                <strong>{rec.title}</strong>
                <p style={{ marginTop: 6 }}>{rec.reason}</p>
                <div className="note-meta">
                  <span>Related notes: {rec.note_ids.join(", ")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
