export default function Home() {
  return (
    <div className="landing-page">
      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="hero-glow-a" />
        <div className="hero-glow-b" />
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Now in beta — free to try
          </div>
          <h1 className="hero-heading">
            Your reading,
            <br />
            <span className="hero-gradient-text">distilled &amp; searchable.</span>
          </h1>
          <p className="hero-sub">
            Semantic Web Intelligence Platform captures what you read, surfaces key insights, and builds
            a personal knowledge base that grows smarter over time.
          </p>
          <div className="hero-cta-row">
            <a className="btn primary hero-btn-primary" href="/register">
              Get started free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a className="btn ghost" href="/login">
              Sign in
            </a>
          </div>
          <p className="hero-footnote">No credit card required · Works with any webpage</p>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────── */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          <p className="section-eyebrow">What it does</p>
          <h2 className="section-heading">Everything your reading produces, organized.</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">🔍</div>
              <h3>Capture &amp; Summarize</h3>
              <p>One-click browser extension that extracts, summarizes, and stores any article or webpage you read — no copy-paste needed.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">💡</div>
              <h3>Semantic Search</h3>
              <p>Ask questions in plain English across everything you've saved. Semantic Web Intelligence Platform finds the relevant notes even when keywords don't match.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">🕸️</div>
              <h3>Knowledge Graph</h3>
              <p>See how your ideas connect. Our graph maps relationships between notes, topics, and sources so patterns naturally emerge.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">📚</div>
              <h3>Collections</h3>
              <p>Group saved content into topic-based collections. Build reading lists, research threads, or project references with ease.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">📊</div>
              <h3>Reading Analytics</h3>
              <p>Track what you read, when you read it, and how your knowledge compounds over days, weeks, and months.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">⚡</div>
              <h3>Daily Digest</h3>
              <p>Get a personalized digest of your recent saves, surfacing forgotten gems and suggesting what to revisit next.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────────── */}
      <section className="landing-section steps-section">
        <div className="landing-container">
          <p className="section-eyebrow">How it works</p>
          <h2 className="section-heading">Three steps to a smarter knowledge base.</h2>
          <div className="steps-grid">
            <div className="step-item">
              <div className="step-number">01</div>
              <h3>Install the Extension</h3>
              <p>Add Semantic Web Intelligence Platform to Chrome or Firefox in under a minute. It stays out of your way until you need it.</p>
            </div>
            <div className="step-connector" aria-hidden="true" />
            <div className="step-item">
              <div className="step-number">02</div>
              <h3>Read &amp; Capture</h3>
              <p>Browse normally. Hit the Semantic Web Intelligence Platform button when something is worth keeping — it summarizes and stores it instantly.</p>
            </div>
            <div className="step-connector" aria-hidden="true" />
            <div className="step-item">
              <div className="step-number">03</div>
              <h3>Explore &amp; Discover</h3>
              <p>Search, ask questions, browse your graph, and watch connections form across everything you've read.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────────── */}
      <section className="cta-banner">
        <div className="landing-container cta-banner-inner">
          <h2>Start building your knowledge base today.</h2>
          <p>Free forever on the starter plan. No credit card, no setup friction.</p>
          <div className="hero-cta-row">
            <a className="btn primary hero-btn-primary" href="/register">
              Create your free account
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <span className="logo">Semantic Web Intelligence Platform</span>
        <span className="landing-footer-copy">© 2025 Semantic Web Intelligence Platform. All rights reserved.</span>
      </footer>
    </div>
  );
}
