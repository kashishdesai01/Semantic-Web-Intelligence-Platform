"use client";

import { useEffect, useState } from "react";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { pollJob } from "@/lib/jobs";
import { useRouter } from "next/navigation";

type Digest = {
  summary: string;
  themes: { title: string; summary: string; note_ids: number[] }[];
};

export default function DigestPage() {
  const router = useRouter();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  async function generateDigest() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/digest/weekly");
      if (res?.status === "queued") {
        pollJob<Digest>(
          apiFetch,
          res.job_id,
          (result) => setDigest(result),
          (message) => setError(message)
        );
      } else {
        setDigest(res);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate digest");
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
          <h1>Weekly digest</h1>
          <button className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>

        {error ? <p className="muted">{error}</p> : null}

        <div className="panel">
          <button className="btn primary" onClick={generateDigest} disabled={loading}>
            {loading ? "Generating..." : "Generate this week’s digest"}
          </button>
        </div>

        {digest ? (
          <div className="panel">
            <h2>Summary</h2>
            <p>{digest.summary}</p>
            <h2 style={{ marginTop: 16 }}>Themes</h2>
            <div className="list">
              {digest.themes.map((theme, idx) => (
                <div key={idx} className="note">
                  <strong>{theme.title}</strong>
                  <p style={{ marginTop: 6 }}>{theme.summary}</p>
                  <div className="note-meta">
                    <span>Notes: {theme.note_ids.join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
