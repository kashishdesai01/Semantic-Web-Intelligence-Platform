"use client";

import { useEffect, useState } from "react";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { pollJob } from "@/lib/jobs";
import { useRouter } from "next/navigation";

type Recommendation = { title: string; reason: string; note_ids: number[] };

export default function RecommendationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  async function loadRecommendations() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/recommendations");
      if (res?.status === "queued") {
        pollJob<{ recommendations: Recommendation[] }>(
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

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="page">
      <div style={{ width: "min(1100px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1>Recommendations</h1>
          <button className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>

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
      </div>
    </div>
  );
}
