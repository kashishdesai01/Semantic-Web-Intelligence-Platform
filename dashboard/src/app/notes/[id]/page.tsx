"use client";

import { useEffect, useState } from "react";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";

type Note = {
  id: number;
  summary: string;
  key_insights: string[];
  highlights: string[];
  created_at: string;
  url: string;
  title: string | null;
  domain: string | null;
};

export default function NoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const noteId = Number(params?.id);
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (!Number.isFinite(noteId)) {
      setError("Invalid note");
      return;
    }
    loadNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  async function loadNote() {
    try {
      const res = await apiFetch<{ note: Note }>(`/api/notes/${noteId}`);
      setNote(res.note);
    } catch (err: any) {
      setError(err.message || "Failed to load note");
    }
  }

  function logout() {
    clearToken();
    router.replace("/login");
  }

  if (error) {
    return (
      <div className="page">
        <div style={{ width: "min(900px, 100%)" }}>
          <p className="muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="page">
        <div style={{ width: "min(900px, 100%)" }}>
          <p className="muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ width: "min(900px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h1>{note.title || "Untitled"}</h1>
          <button className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>

        <div className="panel">
          <div className="note-meta">
            <span>{note.domain || "Unknown domain"}</span>
            <span>{new Date(note.created_at).toLocaleString()}</span>
            <a href={note.url} target="_blank" rel="noreferrer">
              Open source
            </a>
          </div>
          <p style={{ marginTop: 12 }}>{note.summary}</p>
        </div>

        <div className="panel">
          <h2>Key insights</h2>
          <ul className="list">
            {note.key_insights?.length ? (
              note.key_insights.map((insight, idx) => (
                <li key={idx} className="note">
                  {insight}
                </li>
              ))
            ) : (
              <p className="muted">No key insights yet.</p>
            )}
          </ul>
        </div>

        <div className="panel">
          <h2>Highlights</h2>
          <ul className="list">
            {note.highlights?.length ? (
              note.highlights.map((h, idx) => (
                <li key={idx} className="note">
                  {h}
                </li>
              ))
            ) : (
              <p className="muted">No highlights yet.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
