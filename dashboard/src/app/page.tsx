export default function Home() {
  return (
    <div className="page">
      <main className="hero">
        <span className="eyebrow">InsightLens</span>
        <h1>
          Your reading, distilled.
          <span className="accent"> Searchable. Liked. Organized.</span>
        </h1>
        <p>
          Summarize pages, capture key insights, and grow a semantic knowledge
          base of everything you read.
        </p>
        <div className="cta-row">
          <a className="btn primary" href="/register">
            Create account
          </a>
          <a className="btn ghost" href="/login">
            Sign in
          </a>
        </div>
        <div className="hero-grid">
          <div className="hero-card">
            <h3>Notes & Sources</h3>
            <p>Everything you read, neatly stored and searchable.</p>
          </div>
          <div className="hero-card">
            <h3>Collections</h3>
            <p>Group insights into topic-based collections.</p>
          </div>
          <div className="hero-card">
            <h3>Analytics</h3>
            <p>Track what you read, where, and how it compounds.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
