"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

type Totals = { total_notes: number; total_sources: number };
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
type Source = {
  id: number;
  url: string;
  title: string | null;
  domain: string | null;
  first_seen_at: string;
};
type NotesPerDay = { day: string; count: number };
type TopDomain = { domain: string; count: number };
type Collection = { id: number; name: string; created_at: string };
type SearchResult = Note & { distance: number };

export default function DashboardPage() {
  const router = useRouter();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [notesPerDay, setNotesPerDay] = useState<NotesPerDay[]>([]);
  const [topDomains, setTopDomains] = useState<TopDomain[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionName, setCollectionName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(
    null
  );
  const [collectionNotes, setCollectionNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [collectionPickerNoteId, setCollectionPickerNoteId] = useState<
    number | null
  >(null);
  const [collectionPickerValue, setCollectionPickerValue] = useState<
    number | ""
  >("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchCollectionId, setSearchCollectionId] = useState<number | "">("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadAll();
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

  async function loadAll() {
    setError(null);
    try {
      const analytics = await apiFetch<{
        totals: Totals;
        notes_per_day: NotesPerDay[];
        top_domains: TopDomain[];
        recent_notes: Note[];
      }>("/api/analytics/summary");
      setTotals(analytics.totals);
      setNotesPerDay(analytics.notes_per_day || []);
      setTopDomains(analytics.top_domains || []);
      setNotes(analytics.recent_notes || []);

      const sourcesRes = await apiFetch<{ sources: Source[] }>(
        "/api/sources?limit=10"
      );
      setSources(sourcesRes.sources || []);

      const collectionsRes = await apiFetch<{ collections: Collection[] }>(
        "/api/collections"
      );
      setCollections(collectionsRes.collections || []);
      if (collectionsRes.collections?.[0]) {
        setSelectedCollectionId(collectionsRes.collections[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    }
  }

  const maxNotesPerDay = useMemo(() => {
    return Math.max(1, ...notesPerDay.map((row) => Number(row.count) || 0));
  }, [notesPerDay]);

  const maxDomainCount = useMemo(() => {
    return Math.max(1, ...topDomains.map((row) => Number(row.count) || 0));
  }, [topDomains]);

  async function toggleLike(note: Note) {
    try {
      if (note.liked) {
        await apiFetch(`/api/notes/${note.id}/like`, { method: "DELETE" });
      } else {
        await apiFetch(`/api/notes/${note.id}/like`, { method: "POST" });
      }
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, liked: !n.liked } : n))
      );
    } catch (err: any) {
      setError(err.message || "Failed to update like");
    }
  }

  async function createCollection() {
    if (!collectionName.trim()) return;
    try {
      setActionMessage(null);
      const res = await apiFetch<{ collection: Collection }>("/api/collections", {
        method: "POST",
        body: JSON.stringify({ name: collectionName.trim() }),
      });
      setCollections((prev) => [res.collection, ...prev]);
      setCollectionName("");
      setSelectedCollectionId(res.collection.id);
      setActionMessage("Collection created.");
    } catch (err: any) {
      setError(err.message || "Failed to create collection");
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

  async function addNoteToCollection(noteId: number, collectionId: number) {
    if (!collectionId) return;
    try {
      setActionMessage(null);
      await apiFetch(`/api/collections/${collectionId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note_id: noteId }),
      });
      setActionMessage("Note added to collection.");
      if (selectedCollectionId) {
        await loadCollectionNotes(selectedCollectionId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to add note to collection");
    }
  }

  async function deleteCollection(collectionId: number) {
    try {
      setActionMessage(null);
      await apiFetch(`/api/collections/${collectionId}`, { method: "DELETE" });
      setCollections((prev) => prev.filter((c) => c.id !== collectionId));
      if (selectedCollectionId === collectionId) {
        setSelectedCollectionId(null);
        setCollectionNotes([]);
      }
      setActionMessage("Collection deleted.");
    } catch (err: any) {
      setError(err.message || "Failed to delete collection");
    }
  }

  async function deleteNote(noteId: number) {
    try {
      setActionMessage(null);
      await apiFetch(`/api/notes/${noteId}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setCollectionNotes((prev) => prev.filter((n) => n.id !== noteId));
      setActionMessage("Note deleted.");
    } catch (err: any) {
      setError(err.message || "Failed to delete note");
    }
  }

  async function runSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setHasSearched(true);
    setActionMessage(null);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("q", searchQuery.trim());
      params.set("limit", "5");
      params.set("min_similarity", "0.78");
      if (searchCollectionId) {
        params.set("collection_id", String(searchCollectionId));
      }
      const res = await apiFetch<{ results: SearchResult[] }>(
        `/api/notes/search?${params.toString()}`
      );
      setSearchResults(res.results || []);
      setActionMessage("Search complete.");
    } catch (err: any) {
      setError(err.message || "Search failed");
    } finally {
      setSearching(false);
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
          <h1>Dashboard</h1>
          <button className="btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>

        {error ? <p className="muted">{error}</p> : null}
        {actionMessage ? <p className="muted">{actionMessage}</p> : null}

        <div className="card-grid">
          <div className="card">
            <span className="muted">Total notes</span>
            <strong>{totals?.total_notes ?? 0}</strong>
          </div>
          <div className="card">
            <span className="muted">Total sources</span>
            <strong>{totals?.total_sources ?? 0}</strong>
          </div>
          <div className="card">
            <span className="muted">Collections</span>
            <strong>{collections.length}</strong>
          </div>
        </div>

        <div className="panel">
          <h2>Reading pulse (30 days)</h2>
          <div className="chart">
            {notesPerDay.length === 0 ? (
              <p className="muted">No notes yet. Start summarizing!</p>
            ) : (
              notesPerDay.map((row) => (
                <div className="bar" key={row.day}>
                  <span className="muted">
                    {new Date(row.day).toLocaleDateString()}
                  </span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(Number(row.count) / maxNotesPerDay) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <h2>Top domains</h2>
          <div className="chart">
            {topDomains.length === 0 ? (
              <p className="muted">No domains yet.</p>
            ) : (
              topDomains.map((row) => (
                <div className="bar" key={row.domain}>
                  <span className="muted">{row.domain}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(Number(row.count) / maxDomainCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <h2>Collections</h2>
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
                    Use this collection when saving notes
                  </label>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <h3>Selected collection notes</h3>
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

        <div className="panel">
          <h2>Semantic search</h2>
          <form onSubmit={runSearch} style={{ display: "flex", gap: 12 }}>
            <input
              style={{ flex: 1 }}
              placeholder="Search your knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn primary" type="submit" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </button>
          </form>
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <label className="muted">Collection</label>
            <select
              value={searchCollectionId}
              onChange={(e) =>
                setSearchCollectionId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
            >
              <option value="">All collections</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>
          <div className="list" style={{ marginTop: 12 }}>
            {searchResults.length === 0 ? (
              <p className="muted">
                {hasSearched
                  ? "No results above relevance threshold. Try another query."
                  : "No results yet."}
              </p>
            ) : (
              searchResults.map((note) => (
                <div key={note.id} className="note">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {note.domain ? <span className="pill">{note.domain}</span> : null}
                    <span className="pill">
                      Similarity {(1 - Number(note.distance)).toFixed(2)}
                    </span>
                  </div>
                  <p style={{ marginTop: 8 }}>{note.summary}</p>
                  <div className="note-meta">
                    <span>{note.title || "Untitled"}</span>
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                    <a href={note.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <h2>Recent notes</h2>
          <div className="list">
            {notes.length === 0 ? (
              <p className="muted">No notes yet.</p>
            ) : (
              (showAllNotes ? notes : notes.slice(0, 3)).map((note) => (
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
                    <button className="btn ghost" onClick={() => toggleLike(note)}>
                      {note.liked ? "Unlike" : "Like"}
                    </button>
                    <button
                      className="btn primary"
                      onClick={() => {
                        setCollectionPickerNoteId(
                          collectionPickerNoteId === note.id ? null : note.id
                        );
                        setCollectionPickerValue("");
                      }}
                    >
                      Add to collection
                    </button>
                    <button className="btn ghost" onClick={() => deleteNote(note.id)}>
                      Delete
                    </button>
                  </div>
                  {collectionPickerNoteId === note.id ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <select
                        value={collectionPickerValue}
                        onChange={(e) =>
                          setCollectionPickerValue(
                            e.target.value ? Number(e.target.value) : ""
                          )
                        }
                      >
                        <option value="">Select a collection</option>
                        {collections.map((collection) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn primary"
                        onClick={() => {
                          if (!collectionPickerValue) return;
                          addNoteToCollection(note.id, Number(collectionPickerValue));
                          setCollectionPickerNoteId(null);
                          setCollectionPickerValue("");
                        }}
                        disabled={!collectionPickerValue}
                      >
                        Add
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() => setCollectionPickerNoteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
          {notes.length > 3 ? (
            <button
              className="btn ghost"
              style={{ marginTop: 12 }}
              onClick={() => setShowAllNotes((prev) => !prev)}
            >
              {showAllNotes ? "Show recent only" : "See all notes"}
            </button>
          ) : null}
        </div>

        <div className="panel">
          <h2>Recent sources</h2>
          <div className="list">
            {sources.length === 0 ? (
              <p className="muted">No sources yet.</p>
            ) : (
              sources.map((source) => (
                <div key={source.id} className="note">
                  <strong>{source.title || source.domain || "Untitled"}</strong>
                  <div className="note-meta">
                    <span>{source.domain || "Unknown domain"}</span>
                    <span>{new Date(source.first_seen_at).toLocaleString()}</span>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
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
