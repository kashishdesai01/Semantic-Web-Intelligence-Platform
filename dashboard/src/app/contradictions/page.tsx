"use client";

import { useEffect, useState } from "react";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { pollJob } from "@/lib/jobs";
import { useRouter } from "next/navigation";

type Contradiction = {
  claim_a: string;
  claim_b: string;
  note_ids: number[];
};

export default function ContradictionsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Contradiction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  async function loadContradictions() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/contradictions");
      if (res?.status === "queued") {
        pollJob<{ contradictions: Contradiction[] }>(
          apiFetch,
          res.job_id,
          (result) => setItems(result.contradictions || []),
          (message) => setError(message)
        );
      } else {
        setItems(res.contradictions || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load contradictions");
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
          <h1>Contradictions</h1>
          <button className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>

        {error ? <p className="muted">{error}</p> : null}

        <div className="panel">
          <button
            className="btn primary"
            onClick={loadContradictions}
            disabled={loading}
          >
            {loading ? "Checking..." : "Find contradictions"}
          </button>
        </div>

        <div className="panel">
          <h2>Potential conflicts</h2>
          <div className="list">
            {items.length === 0 ? (
              <p className="muted">No contradictions found yet.</p>
            ) : (
              items.map((item, idx) => (
                <div key={idx} className="note">
                  <strong>Claim A</strong>
                  <p>{item.claim_a}</p>
                  <strong>Claim B</strong>
                  <p>{item.claim_b}</p>
                  <div className="note-meta">
                    <span>Notes: {item.note_ids.join(", ")}</span>
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
