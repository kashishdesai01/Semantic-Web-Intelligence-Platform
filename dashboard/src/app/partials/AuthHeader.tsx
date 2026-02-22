"use client";

import { usePathname } from "next/navigation";

const HIDE_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export default function AuthHeader() {
  const pathname = usePathname();
  if (HIDE_ROUTES.includes(pathname)) return null;

  return (
    <header className="nav">
      <a className="logo" href="/">
        InsightLens
      </a>
      <nav className="nav-links">
        <a href="/dashboard">Home</a>
        <a href="/notes">Saved notes</a>
        <a href="/collections">Collections</a>
        <a href="/analytics">Analytics</a>
        <a href="/ask">Ask</a>
        <a href="/digest">Digest</a>
        <a href="/graph">Graph</a>
        <a href="/recommendations">Recommendations</a>
        <a href="/contradictions">Contradictions</a>
        <a href="/recall">Recall</a>
      </nav>
    </header>
  );
}
