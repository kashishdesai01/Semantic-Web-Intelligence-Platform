"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import PageShell from "@/components/layout/PageShell";
import Toast from "@/components/ui/Toast";
import type { Note, Collection } from "@/lib/types";
import { useRequireAuth } from "@/lib/useRequireAuth";


export default function CollectionsPage() {
  useRequireAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionName, setCollectionName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(
    null
  );
  const [collectionNotes, setCollectionNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
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

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadCollections() {
    try {
      setLoadingCollections(true);
      const res = await apiFetch<{ collections: Collection[] }>(
        "/api/collections"
      );
      setCollections(res.collections || []);
      if (res.collections?.[0]) {
        setSelectedCollectionId(res.collections[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load collections");
      setToast({ message: err.message || "Failed to load collections", kind: "error" });
    } finally {
      setLoadingCollections(false);
    }
  }

  async function loadCollectionNotes(collectionId: number) {
    try {
      setLoadingNotes(true);
      const res = await apiFetch<{ notes: Note[] }>(
        `/api/collections/${collectionId}/notes`
      );
      setCollectionNotes(res.notes || []);
    } catch (err: any) {
      setError(err.message || "Failed to load collection notes");
      setToast({ message: err.message || "Failed to load collection notes", kind: "error" });
    } finally {
      setLoadingNotes(false);
    }
  }

  async function createCollection() {
    if (!collectionName.trim()) return;
    try {
      setCreating(true);
      const res = await apiFetch<{ collection: Collection }>("/api/collections", {
        method: "POST",
        body: JSON.stringify({ name: collectionName.trim() }),
      });
      setCollections((prev) => [res.collection, ...prev]);
      setCollectionName("");
      setSelectedCollectionId(res.collection.id);
      setToast({ message: "Collection created.", kind: "success" });
    } catch (err: any) {
      setError(err.message || "Failed to create collection");
      setToast({ message: err.message || "Failed to create collection", kind: "error" });
    } finally {
      setCreating(false);
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
      setToast({ message: "Collection deleted.", kind: "success" });
    } catch (err: any) {
      setError(err.message || "Failed to delete collection");
      setToast({ message: err.message || "Failed to delete collection", kind: "error" });
    }
  }

  async function deleteNote(noteId: number) {
    try {
      await apiFetch(`/api/notes/${noteId}`, { method: "DELETE" });
      setCollectionNotes((prev) => prev.filter((n) => n.id !== noteId));
      setToast({ message: "Note deleted.", kind: "success" });
    } catch (err: any) {
      setError(err.message || "Failed to delete note");
      setToast({ message: err.message || "Failed to delete note", kind: "error" });
    }
  }

  return (
    <PageShell title="Collections">
      {toast ? (
        <Toast
          message={toast.message}
          kind={toast.kind}
          onClose={() => setToast(null)}
        />
      ) : null}
      {error ? <p className="muted">{error}</p> : null}

      <div className="panel">
        <div className="grid-2">
          <div>
            <h2>Create collection</h2>
            <p className="muted">Start a new space for related notes.</p>
            <div className="form-row" style={{ marginTop: 12 }}>
              <input
                className="input-lg"
                placeholder="New collection name"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
              />
              <button className="btn primary" onClick={createCollection} disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
          <div>
            <h2>View collection</h2>
            <p className="muted">Select a collection to browse its notes.</p>
            <div className="inline-row" style={{ marginTop: 12 }}>
              <select
                value={selectedCollectionId ?? ""}
                onChange={(e) =>
                  setSelectedCollectionId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                aria-label="Select collection"
              >
                <option value="">Select collection</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
              {loadingCollections ? <span className="spinner" aria-hidden /> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="row-between">
          <div>
            <h2>
              {selectedCollectionId
                ? collections.find((c) => c.id === selectedCollectionId)?.name ||
                  "Collection notes"
                : "Collection notes"}
            </h2>
            <p className="muted">Notes saved to this collection.</p>
          </div>
          {loadingNotes ? <span className="spinner" aria-hidden /> : null}
        </div>
        <div className="list">
          {selectedCollectionId && collectionNotes.length === 0 ? (
            <p className="muted">No notes in this collection yet.</p>
          ) : null}
          {collectionNotes.map((note) => (
            <div key={note.id} className="note">
              <div className="note-header">
                {note.domain ? <span className="pill">{note.domain}</span> : null}
                <strong className="note-title">{note.title || "Untitled"}</strong>
              </div>
              <p style={{ marginTop: 8 }}>{note.summary}</p>
              <div className="note-meta">
                <span>{note.domain || "Unknown domain"}</span>
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
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Manage collections</h2>
        <div className="list">
          {collections.length === 0 ? (
            <p className="muted">No collections yet.</p>
          ) : (
            collections.map((collection) => (
              <div key={collection.id} className="collection-card">
                <div className="row-between">
                  <strong className="note-title">{collection.name}</strong>
                  <button
                    className="btn ghost"
                    onClick={() => deleteCollection(collection.id)}
                  >
                    Delete
                  </button>
                </div>
                <p className="muted" style={{ marginTop: 6 }}>
                  Created {new Date(collection.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
