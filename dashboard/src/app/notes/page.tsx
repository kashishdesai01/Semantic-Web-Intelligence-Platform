"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import PageShell from "@/components/layout/PageShell";
import { useRequireAuth } from "@/lib/useRequireAuth";
import type { Note } from "@/lib/types";

export default function NotesPage() {
  useRequireAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  return (
    <PageShell title="Saved notes">
      {error ? <p className="muted">{error}</p> : null}

      <div className="panel">
        <h2>All notes</h2>
        <div className="list">
          {notes.length === 0 ? (
            <p className="muted">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="note">
                <div className="note-header">
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
                <div className="note-actions">
                  <button className="btn ghost" onClick={() => deleteNote(note.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
