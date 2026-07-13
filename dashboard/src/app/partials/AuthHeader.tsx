"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";

const HIDE_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];
const AUTH_APP_ROUTES = ["/dashboard", "/notes", "/collections", "/analytics", "/ask", "/digest", "/graph", "/recommendations", "/contradictions", "/recall"];

export default function AuthHeader() {
  const pathname = usePathname();
  const [isAuthed, setIsAuthed] = useState(false);
  const isLanding = pathname === "/";

  useEffect(() => {
    setIsAuthed(Boolean(getToken()));
  }, []);

  function signOut() {
    clearToken();
    window.location.href = "/login";
  }

  if (HIDE_ROUTES.includes(pathname)) return null;
  // Pages using the new left-sidebar shell manage their own nav — suppress
  // the global top nav for all of them.
  if (AUTH_APP_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"))) return null;

  return (
    <header className="nav">
      <a className="logo" href="/">
        Semantic Web Intelligence Platform
      </a>

      {isLanding && !isAuthed ? (
        /* ── Landing nav: just anchor links + auth CTAs ── */
        <div className="row">
          <nav className="nav-links">
            <a href="#features">Features</a>
          </nav>
          <div className="row" style={{ gap: 8 }}>
            <a className="btn ghost" href="/login" style={{ padding: "8px 16px", fontSize: 14 }}>
              Sign in
            </a>
            <a className="btn primary" href="/register" style={{ padding: "8px 16px", fontSize: 14 }}>
              Get started
            </a>
          </div>
        </div>
      ) : (
        /* ── App nav: full links for authenticated app ── */
        <div className="row">
          <nav className="nav-links">
            <a href="/dashboard">Home</a>
            <a href="/notes">Notes</a>
            <a href="/collections">Collections</a>
            <a href="/analytics">Analytics</a>
            <a href="/ask">Ask</a>
            <a href="/digest">Digest</a>
            <a href="/graph">Graph</a>
          </nav>
          {isAuthed ? (
            <button className="btn ghost" onClick={signOut}>
              Sign out
            </button>
          ) : (
            <a className="btn ghost" href="/login">
              Sign in
            </a>
          )}
        </div>
      )}
    </header>
  );
}
