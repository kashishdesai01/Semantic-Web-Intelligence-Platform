"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import PageShell from "@/components/layout/PageShell";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Source = { note_id: number; title: string; url: string; highlights: string[] };

export default function RecallPage() {
  useRequireAuth();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  async function runRecall(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ answer: string; sources: Source[] }>(
        "/api/recall",
        {
          method: "POST",
          body: JSON.stringify({ query }),
        }
      );
      setAnswer(res.answer);
      setSources(res.sources || []);
    } catch (err: any) {
      setError(err.message || "Recall failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell title="Recall">
      {error ? <p className="muted">{error}</p> : null}

      <div className="panel">
        <form onSubmit={runRecall} className="row">
          <input
            style={{ flex: 1 }}
            placeholder="Where did I read about...?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Recalling..." : "Recall"}
          </button>
        </form>
      </div>

      {answer ? (
        <div className="panel">
          <h2>Answer</h2>
          <p>{answer}</p>
        </div>
      ) : null}

      <div className="panel">
        <h2>Sources</h2>
        <div className="list">
          {sources.length === 0 ? (
            <p className="muted">No sources yet.</p>
          ) : (
            sources.map((s) => (
              <div key={s.note_id} className="note">
                <strong>{s.title || "Untitled"}</strong>
                <div className="note-meta">
                  <span>Note #{s.note_id}</span>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    Open source
                  </a>
                  <a href={`/notes/${s.note_id}`}>Open note</a>
                </div>
                {s.highlights?.length ? (
                  <div style={{ marginTop: 8 }}>
                    <strong>Highlights</strong>
                    <ul className="list">
                      {s.highlights.map((h, idx) => (
                        <li key={idx} className="note">
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
