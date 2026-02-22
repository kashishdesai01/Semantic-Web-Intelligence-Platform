"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setResetUrl(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; reset_url?: string }>(
        "/api/auth/forgot",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        }
      );
      setStatus("If the email exists, a reset link has been sent.");
      if (res.reset_url) {
        setResetUrl(res.reset_url);
      }
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="auth-card">
        <h2>Reset your password</h2>
        <p className="muted">Enter your email to receive a reset link.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error ? <p className="muted">{error}</p> : null}
          {status ? <p className="muted">{status}</p> : null}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
        {resetUrl ? (
          <p className="muted" style={{ marginTop: 12 }}>
            Reset link (dev): <a href={resetUrl}>Open reset page</a>
          </p>
        ) : null}
        <p className="muted" style={{ marginTop: 12 }}>
          <a href="/login">Back to sign in</a>
        </p>
      </div>
    </div>
  );
}
