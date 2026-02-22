"use client";

import { useEffect, useState } from "react";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

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

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadNotes() {
    try {
      const res = await apiFetch<{ notes: Note[] }>("/api/notes?limit=200");
      setNotes(res.notes || []);
    } catch (err: any) {
      setError(err.message || "Failed to load notes");
    }
  }

  async function deleteNote(noteId: number) {
    try {
      await apiFetch(`/api/notes/${noteId}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err: any) {
      setError(err.message || "Failed to delete note");
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
          <h1>Saved notes</h1>
          <button className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>

        {error ? <p className="muted">{error}</p> : null}

        <div className="panel">
          <h2>All notes</h2>
          <div className="list">
            {notes.length === 0 ? (
              <p className="muted">No notes yet.</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="note">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {note.domain ? <span className="pill">{note.domain}</span> : null}
                    {note.liked ? <span className="pill">Liked</span> : null}
                  </div>
                  <p style={{ marginTop: 8 }}>{note.summary}</p>
                  <div className="note-meta">
                    <span>{note.title || "Untitled"}</span>
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                    <a href={note.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="btn ghost" onClick={() => deleteNote(note.id)}>
                      Delete
                    </button>
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
