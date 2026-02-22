"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!token) {
      setError("Missing token.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      setStatus("Password reset successfully. You can now sign in.");
      setPassword("");
      setConfirm("");
    } catch (err: any) {
      setError(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="auth-card">
        <h2>Choose a new password</h2>
        <p className="muted">
          Must be at least 8 characters, include 1 uppercase letter, 1 number,
          and 1 special character.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {error ? <p className="muted">{error}</p> : null}
          {status ? <p className="muted">{status}</p> : null}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          <a href="/login">Back to sign in</a>
        </p>
      </div>
    </div>
  );
}
