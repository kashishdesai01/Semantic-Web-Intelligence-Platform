"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import PageShell from "@/components/layout/PageShell";
import type { Citation, QaItem } from "@/lib/types";

type Message = { role: "user" | "assistant"; content: string };

export default function AskPage() {
  useRequireAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [answerWithCitations, setAnswerWithCitations] = useState<string>("");
  const [history, setHistory] = useState<QaItem[]>([]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadHistory() {
    try {
      const res = await apiFetch<{ items: QaItem[] }>("/api/qa?limit=20");
      setHistory(res.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load Q&A history");
    }
  }

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const question = input.trim();
    setInput("");
    setError(null);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    try {
      const res = await apiFetch<{
        answer: string;
        citations: Citation[];
        answer_with_citations?: string;
      }>(
        "/api/ask",
        {
          method: "POST",
          body: JSON.stringify({ question }),
        }
      );
      const answerText = res.answer_with_citations || res.answer;
      setAnswerWithCitations(answerText);
      setMessages((prev) => [...prev, { role: "assistant", content: answerText }]);
      setCitations(res.citations || []);
      await apiFetch("/api/qa", {
        method: "POST",
        body: JSON.stringify({
          question,
          answer: res.answer,
          answer_with_citations: res.answer_with_citations || null,
          citations: res.citations || [],
        }),
      });
      loadHistory();
    } catch (err: any) {
      setError(err.message || "Failed to answer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell title="Ask your knowledge base">
      {error ? <p className="muted">{error}</p> : null}

      <div className="panel">
        <div className="list">
          {messages.length === 0 ? (
            <p className="muted">Ask a question about anything you’ve read.</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="note">
                <strong>{msg.role === "user" ? "You" : "Semantic Web Intelligence Platform"}</strong>
                <p style={{ marginTop: 6 }}>{msg.content}</p>
              </div>
            ))
          )}
        </div>
        <form onSubmit={submitQuestion} className="row" style={{ marginTop: 12 }}>
          <input
            style={{ flex: 1 }}
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Thinking..." : "Ask"}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Sources</h2>
        <div className="list">
          {citations.length === 0 ? (
            <p className="muted">No citations yet.</p>
          ) : (
            citations.map((c) => (
              <div key={c.note_id} className="note">
                <strong>{c.title || "Untitled"}</strong>
                <div className="note-meta">
                  <span>Note #{c.note_id}</span>
                  <a href={c.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                  <a href={`/notes/${c.note_id}`}>Open note</a>
                </div>
                {c.highlights?.length ? (
                  <div style={{ marginTop: 8 }}>
                    <strong>Highlights</strong>
                    <ul className="list">
                      {c.highlights.map((h, idx) => (
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

      <div className="panel">
        <h2>Q&A history</h2>
        <div className="list">
          {history.length === 0 ? (
            <p className="muted">No questions yet.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="note">
                <strong>Q:</strong>
                <p>{item.question}</p>
                <strong>A:</strong>
                <p>{item.answer_with_citations || item.answer}</p>
                <div className="note-meta">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
