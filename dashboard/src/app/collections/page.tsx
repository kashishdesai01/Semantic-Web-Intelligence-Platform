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
};

type Collection = { id: number; name: string; created_at: string };

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionName, setCollectionName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(
    null
  );
  const [collectionNotes, setCollectionNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCollectionId) {
      setCollectionNotes([]);
      return;
    }
    loadCollectionNotes(selectedCollectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollectionId]);

  async function loadCollections() {
    try {
      const res = await apiFetch<{ collections: Collection[] }>(
        "/api/collections"
      );
      setCollections(res.collections || []);
      if (res.collections?.[0]) {
        setSelectedCollectionId(res.collections[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load collections");
    }
  }

  async function loadCollectionNotes(collectionId: number) {
    try {
      const res = await apiFetch<{ notes: Note[] }>(
        `/api/collections/${collectionId}/notes`
      );
      setCollectionNotes(res.notes || []);
    } catch (err: any) {
      setError(err.message || "Failed to load collection notes");
    }
  }

  async function createCollection() {
    if (!collectionName.trim()) return;
    try {
      const res = await apiFetch<{ collection: Collection }>("/api/collections", {
        method: "POST",
        body: JSON.stringify({ name: collectionName.trim() }),
      });
      setCollections((prev) => [res.collection, ...prev]);
      setCollectionName("");
      setSelectedCollectionId(res.collection.id);
    } catch (err: any) {
      setError(err.message || "Failed to create collection");
    }
  }

  async function deleteCollection(collectionId: number) {
    try {
      await apiFetch(`/api/collections/${collectionId}`, { method: "DELETE" });
      setCollections((prev) => prev.filter((c) => c.id !== collectionId));
      if (selectedCollectionId === collectionId) {
        setSelectedCollectionId(null);
        setCollectionNotes([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete collection");
    }
  }

  async function deleteNote(noteId: number) {
    try {
      await apiFetch(`/api/notes/${noteId}`, { method: "DELETE" });
      setCollectionNotes((prev) => prev.filter((n) => n.id !== noteId));
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
          <h1>Collections</h1>
          <button className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>

        {error ? <p className="muted">{error}</p> : null}

        <div className="panel">
          <h2>Manage collections</h2>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <input
              style={{ flex: 1 }}
              placeholder="New collection name"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
            />
            <button className="btn primary" onClick={createCollection}>
              Create
            </button>
          </div>
          <div className="list">
            {collections.length === 0 ? (
              <p className="muted">No collections yet.</p>
            ) : (
              collections.map((collection) => (
                <div key={collection.id} className="note">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{collection.name}</strong>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="muted">
                        {new Date(collection.created_at).toLocaleDateString()}
                      </span>
                      <button
                        className="btn ghost"
                        onClick={() => deleteCollection(collection.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <label className="muted">
                    <input
                      type="radio"
                      name="collection"
                      value={collection.id}
                      checked={selectedCollectionId === collection.id}
                      onChange={() => setSelectedCollectionId(collection.id)}
                      style={{ marginRight: 8 }}
                    />
                    View this collection
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <h2>Collection notes</h2>
          <div className="list">
            {selectedCollectionId && collectionNotes.length === 0 ? (
              <p className="muted">No notes in this collection yet.</p>
            ) : null}
            {collectionNotes.map((note) => (
              <div key={note.id} className="note">
                <strong>{note.title || "Untitled"}</strong>
                <p style={{ marginTop: 6 }}>{note.summary}</p>
                <div className="note-meta">
                  <span>{note.domain || "Unknown domain"}</span>
                  <span>{new Date(note.created_at).toLocaleString()}</span>
                  <a href={note.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn ghost" onClick={() => deleteNote(note.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
