import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function uiRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
    const html = `<!DOCTYPE html>
<html lang="en" data-type="software" data-radius="sharp" data-buttons="solid" data-motion>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="site-kind" content="software">
  <meta name="page-type" content="software">
  <title>Latch — Multi-Tenant PostgreSQL Task API Platform</title>
  <meta name="description" content="Multi-tenant task API where security is enforced across three independent boundaries: Zod input validation, central RBAC policies, and PostgreSQL row-level security.">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="alternate icon" href="/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #070b14;
      --surface: #0c1220;
      --surface-hover: #121c32;
      --surface-subtle: #090e1a;
      --border: #162035;
      --border-lit: #253655;
      --text: #f8fafc;
      --muted: #94a3b8;
      --dim: #64748b;
      --accent: #38bdf8;
      --accent-hover: #0284c7;
      --emerald: #10b981;
      --emerald-subtle: rgba(16, 185, 129, 0.12);
      --crimson: #f43f5e;
      --crimson-subtle: rgba(244, 63, 94, 0.12);
      --amber: #f59e0b;
      --amber-subtle: rgba(245, 158, 11, 0.12);
      --font-display: "Host Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --font-text: "Host Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
      --m-in: 160ms;
      --m-out: 120ms;
      --m-press: 90ms;
      --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
      --container: 1180px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-text);
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    .wrap {
      max-width: var(--container);
      margin: 0 auto;
      padding: 0 24px;
    }

    /* HEADER & NAVIGATION */
    header.nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(7, 11, 20, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }
    .nav-bar {
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
    }
    .brand-mark {
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      overflow: hidden;
      filter: drop-shadow(0 2px 10px rgba(56, 189, 248, 0.35));
      transition: transform var(--m-out) var(--ease), filter var(--m-out) var(--ease);
    }
    .brand-mark img { width: 100%; height: 100%; display: block; }
    .brand-link:hover .brand-mark {
      transform: scale(1.06);
      filter: drop-shadow(0 4px 14px rgba(56, 189, 248, 0.55));
    }
    .brand-name {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 17px;
      letter-spacing: -0.02em;
    }
    .version-tag {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--dim);
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 24px;
      list-style: none;
    }
    .nav-links a {
      color: var(--muted);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      transition: color var(--m-out) var(--ease);
    }
    .nav-links a:hover { color: var(--text); }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 11.5px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 4px;
      font-family: var(--font-mono);
      background: var(--emerald-subtle);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.28);
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 8px var(--emerald);
      animation: pulse 2.4s infinite ease-in-out;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }

    /* BUTTONS */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 4px;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
      font-family: var(--font-text);
      transition: transform var(--m-out) var(--ease), background var(--m-out) var(--ease), border var(--m-out) var(--ease), box-shadow var(--m-out) var(--ease);
    }
    .btn:hover { transform: translateY(-1px); }
    .btn:active { transform: translateY(1px) scale(0.99); transition-duration: var(--m-press); }
    .btn-primary {
      background: #0284c7;
      color: #ffffff;
      border-color: #38bdf8;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
    }
    .btn-primary:hover {
      background: #0369a1;
      border-color: #7dd3fc;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
    }
    .btn-secondary {
      background: var(--surface);
      color: var(--text);
      border-color: var(--border-lit);
    }
    .btn-secondary:hover {
      background: var(--surface-hover);
      border-color: #475569;
    }

    /* HERO SPLIT */
    .hero-section {
      padding: 72px 0 84px;
      border-bottom: 1px solid var(--border);
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: 48px;
      align-items: center;
    }
    .hero-kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 11.5px;
      font-weight: 600;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 16px;
    }
    .hero-title {
      font-family: var(--font-display);
      font-size: clamp(34px, 3.2vw, 46px);
      font-weight: 700;
      letter-spacing: -0.035em;
      line-height: 1.15;
      margin-bottom: 20px;
    }
    .hero-title span.highlight {
      color: var(--accent);
    }
    .hero-lead {
      color: var(--muted);
      font-size: 16.5px;
      line-height: 1.6;
      margin-bottom: 30px;
      max-width: 520px;
    }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 36px;
    }
    .metrics-row {
      display: flex;
      gap: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
    }
    .metric-item { display: flex; flex-direction: column; }
    .metric-value {
      font-family: var(--font-mono);
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.02em;
    }
    .metric-label {
      font-size: 12px;
      color: var(--dim);
      font-family: var(--font-text);
      margin-top: 2px;
    }

    /* APP-FRAME: LIVE PRODUCT UI */
    .app-frame {
      background: #03060c;
      border: 1px solid var(--border-lit);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.7), 0 0 24px -4px rgba(56, 189, 248, 0.15);
      display: flex;
      flex-direction: column;
    }
    .app-frame-header {
      background: #080d17;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .window-controls {
      display: flex;
      gap: 7px;
    }
    .dot-win {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-close { background: #ef4444; }
    .dot-min { background: #f59e0b; }
    .dot-max { background: #10b981; }
    .app-frame-title {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--dim);
    }
    .app-frame-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      background: rgba(56, 189, 248, 0.12);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 2px 7px;
      border-radius: 3px;
    }

    .scenario-tabs {
      display: flex;
      background: #060911;
      border-bottom: 1px solid var(--border);
      overflow-x: auto;
    }
    .tab-btn {
      padding: 10px 16px;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 500;
      color: var(--muted);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      white-space: nowrap;
      transition: color var(--m-out) var(--ease), background var(--m-out) var(--ease), border-color var(--m-out) var(--ease);
    }
    .tab-btn:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.02);
    }
    .tab-btn.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
      background: #090e1a;
    }

    .code-console {
      padding: 18px 20px;
      font-family: var(--font-mono);
      font-size: 12.5px;
      line-height: 1.6;
      background: #040710;
      color: #94a3b8;
      min-height: 220px;
    }
    .c-comment { color: #475569; font-style: italic; }
    .c-kw { color: #38bdf8; font-weight: 600; }
    .c-str { color: #34d399; }
    .c-fn { color: #fbbf24; }
    .c-hl { color: #f8fafc; font-weight: 500; }

    .result-pane {
      background: #070c17;
      border-top: 1px solid var(--border);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .status-pill {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .status-200 { background: var(--emerald-subtle); color: var(--emerald); border: 1px solid rgba(16, 185, 129, 0.3); }
    .status-404 { background: var(--crimson-subtle); color: var(--crimson); border: 1px solid rgba(244, 63, 94, 0.3); }
    .status-409 { background: var(--amber-subtle); color: var(--amber); border: 1px solid rgba(245, 158, 11, 0.3); }

    .run-btn {
      font-family: var(--font-mono);
      font-size: 11.5px;
      padding: 5px 12px;
      background: #0f1d38;
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background var(--m-out) var(--ease), border-color var(--m-out) var(--ease);
    }
    .run-btn:hover {
      background: #1e293b;
      border-color: var(--accent);
    }

    /* SECTION 2: DEFENSE IN DEPTH */
    .section {
      padding: 88px 0;
      border-bottom: 1px solid var(--border);
    }
    .section-head {
      margin-bottom: 48px;
    }
    .section-tag {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .section-title {
      font-family: var(--font-display);
      font-size: clamp(28px, 2.5vw, 36px);
      font-weight: 700;
      letter-spacing: -0.03em;
      margin-bottom: 12px;
    }
    .section-desc {
      color: var(--muted);
      font-size: 16px;
      max-width: 680px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 28px 24px;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: transform var(--m-in) var(--ease), border-color var(--m-in) var(--ease), box-shadow var(--m-in) var(--ease);
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: var(--border-lit);
      box-shadow: 0 10px 30px -6px rgba(0, 0, 0, 0.45);
    }
    .card-num {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      color: var(--accent);
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .card-h3 {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 10px;
    }
    .card-body {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 20px;
      flex-grow: 1;
    }
    .card-list {
      list-style: none;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card-list li {
      font-family: var(--font-mono);
      font-size: 12px;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-list li::before {
      content: "—";
      color: var(--accent);
    }

    /* SECTION 3: ENDPOINTS & CURL HARNESS */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .api-card {
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .api-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .api-method {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      padding: 3px 6px;
      border-radius: 3px;
    }
    .method-post { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .method-get { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .api-path {
      font-family: var(--font-mono);
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text);
    }
    .copy-pill {
      font-family: var(--font-mono);
      font-size: 10.5px;
      background: transparent;
      color: var(--dim);
      border: 1px solid var(--border);
      padding: 3px 8px;
      border-radius: 3px;
      cursor: pointer;
      transition: color var(--m-out) var(--ease), border-color var(--m-out) var(--ease);
    }
    .copy-pill:hover {
      color: var(--text);
      border-color: var(--border-lit);
    }
    .api-snippet {
      background: #03050a;
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 4px;
      padding: 12px;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: #94a3b8;
      overflow-x: auto;
      white-space: pre;
    }

    /* FOOTER */
    footer.page-footer {
      padding: 48px 0 64px;
      background: #04070e;
    }
    .footer-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 20px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .footer-meta {
      font-size: 13px;
      color: var(--dim);
    }
    .footer-links {
      display: flex;
      gap: 24px;
      list-style: none;
    }
    .footer-links a {
      color: var(--muted);
      text-decoration: none;
      font-size: 13px;
      transition: color var(--m-out) var(--ease);
    }
    .footer-links a:hover { color: var(--text); }
    .footer-baseline {
      padding-top: 24px;
      font-size: 12px;
      color: var(--dim);
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    @media (max-width: 960px) {
      .hero-grid { grid-template-columns: 1fr; }
      .grid-3 { grid-template-columns: 1fr; }
      .grid-2 { grid-template-columns: 1fr; }
      .nav-links { display: none; }
    }
  </style>
</head>
<body>
  <!-- HEADER & NAVIGATION -->
  <header class="nav">
    <div class="wrap nav-bar">
      <a href="/" class="brand-link">
        <div class="brand-mark">
          <img src="/favicon.svg" alt="Latch Mark">
        </div>
        <span class="brand-name">Latch Platform</span>
        <span class="version-tag">v1.0.0</span>
      </a>

      <ul class="nav-links">
        <li><a href="#simulator">Security Simulator</a></li>
        <li><a href="#architecture">Defense Layers</a></li>
        <li><a href="#endpoints">API Endpoints</a></li>
        <li><a href="/docs">OpenAPI Spec</a></li>
      </ul>

      <div class="nav-actions">
        <div class="badge-live">
          <div class="pulse-dot"></div>
          <span>PG POOL ACTIVE</span>
        </div>
        <a href="/docs" class="btn btn-primary">OpenAPI Docs</a>
      </div>
    </div>
  </header>

  <main>
    <!-- HERO: SPLIT LAYOUT -->
    <section class="hero-section" id="top">
      <div class="wrap hero-grid">
        <div class="hero-content">
          <div class="hero-kicker">
            <span class="pulse-dot" style="background: var(--accent); box-shadow: 0 0 8px var(--accent);"></span>
            PostgreSQL 16 · Row-Level Security · Zero ORM
          </div>
          <h1 class="hero-title">
            Multi-tenant task engine where <span class="highlight">PostgreSQL enforces row-level security</span>.
          </h1>
          <p class="hero-lead">
            Three independent defense boundaries isolate every tenant. If an application handler misses an authorization check, PostgreSQL transaction policies isolate the tenant data at the storage layer.
          </p>

          <div class="hero-actions">
            <a href="/docs" class="btn btn-primary">Inspect OpenAPI Endpoints</a>
            <a href="/health/readiness" class="btn btn-secondary">Verify Health & DB Pool</a>
          </div>

          <div class="metrics-row">
            <div class="metric-item">
              <span class="metric-value">3 Layers</span>
              <span class="metric-label">Defense in depth</span>
            </div>
            <div class="metric-item">
              <span class="metric-value">NOBYPASSRLS</span>
              <span class="metric-label">PostgreSQL role boundary</span>
            </div>
            <div class="metric-item">
              <span class="metric-value">404</span>
              <span class="metric-label">Anti-enumeration code</span>
            </div>
          </div>
        </div>

        <!-- RIGHT: INTERACTIVE LIVE SECURITY SIMULATOR (APP-FRAME) -->
        <div class="hero-visual" id="simulator">
          <div class="app-frame">
            <div class="app-frame-header">
              <div class="window-controls">
                <span class="dot-win dot-close"></span>
                <span class="dot-win dot-min"></span>
                <span class="dot-win dot-max"></span>
              </div>
              <div class="app-frame-title">psql: latch_app@localhost:5432/latch_dev</div>
              <div class="app-frame-badge">RLS ENFORCED</div>
            </div>

            <div class="scenario-tabs">
              <button class="tab-btn active" onclick="selectScenario(0)">1. Tenant Scope</button>
              <button class="tab-btn" onclick="selectScenario(1)">2. Cross-Tenant 404</button>
              <button class="tab-btn" onclick="selectScenario(2)">3. Concurrency 409</button>
              <button class="tab-btn" onclick="selectScenario(3)">4. Live DB Ping</button>
            </div>

            <div class="code-console" id="codeConsole">
              <!-- Content populated via JavaScript -->
            </div>

            <div class="result-pane">
              <div id="resultStatus" class="status-pill status-200">
                <span class="pulse-dot"></span>
                <span id="statusLabel">200 OK — 2 ROWS RETURNED</span>
              </div>
              <button class="run-btn" id="runSimBtn" onclick="runSimulation()">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                <span>Run Transaction</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: DEFENSE IN DEPTH ARCHITECTURE -->
    <section class="section" id="architecture">
      <div class="wrap">
        <div class="section-head">
          <p class="section-tag">Security Architecture</p>
          <h2 class="section-title">Three independent security perimeters</h2>
          <p class="section-desc">
            Validated input, centralized RBAC policies, and PostgreSQL row-level security running inside atomic transaction boundaries.
          </p>
        </div>

        <div class="grid-3">
          <!-- CARD 1 -->
          <div class="card">
            <span class="card-num">PERIMETER 01 · EDGE INGESTION</span>
            <h3 class="card-h3">Zod Schemas & Sessions</h3>
            <p class="card-body">
              Strict payload validation rejects unexpected fields. Opaque 256-bit session tokens stored exclusively as SHA-256 digests with constant-time dummy verification.
            </p>
            <ul class="card-list">
              <li>Argon2id password hashing</li>
              <li>Constant-time dummy verify</li>
              <li>Dual Cookie & Bearer token support</li>
              <li>Automated session reaper job</li>
            </ul>
          </div>

          <!-- CARD 2 -->
          <div class="card">
            <span class="card-num">PERIMETER 02 · APPLICATION DOMAIN</span>
            <h3 class="card-h3">Centralized RBAC Policies</h3>
            <p class="card-body">
              Pure, unit-tested policies enforce hierarchical permissions before reaching service handlers. Anti-enumeration returns 404 on cross-tenant probes.
            </p>
            <ul class="card-list">
              <li>Owner, Member, Viewer roles</li>
              <li>Anti-enumeration 404 masks IDs</li>
              <li>Sole-owner demotion invariant</li>
              <li>Atomic audit trail recording</li>
            </ul>
          </div>

          <!-- CARD 3 -->
          <div class="card">
            <span class="card-num">PERIMETER 03 · STORAGE KERNEL</span>
            <h3 class="card-h3">PostgreSQL Kernel RLS</h3>
            <p class="card-body">
              Runtime database connection uses restricted NOBYPASSRLS role. Transaction-scoped context variables restrict row access even if application checks fail.
            </p>
            <ul class="card-list">
              <li>FORCE ROW LEVEL SECURITY</li>
              <li>SET LOCAL app.current_tenant_id</li>
              <li>Zero ORM: Parameterized SQL only</li>
              <li>Optimistic version concurrency</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: VERIFICATION & ENDPOINTS -->
    <section class="section" id="endpoints">
      <div class="wrap">
        <div class="section-head">
          <p class="section-tag">Integration & Verification</p>
          <h2 class="section-title">Verified against real PostgreSQL in CI</h2>
          <p class="section-desc">
            Zero mocks for the database engine. 78 unit, integration, and security tests prove every invariant against real concurrent workloads.
          </p>
        </div>

        <div class="grid-2">
          <!-- API CARD 1 -->
          <div class="api-card">
            <div class="api-card-top">
              <span class="api-method method-post">POST</span>
              <span class="api-path">/api/v1/auth/login</span>
              <button class="copy-pill" onclick="copySnippet(this, 'curl -s -X POST http://localhost:3001/api/v1/auth/login -H \\'content-type: application/json\\' -d \\'{\\"email\\":\\"alice@example.com\\",\\"password\\":\\"Password123!\\"}\\'')">Copy curl</button>
            </div>
            <div class="api-snippet">curl -X POST http://localhost:3001/api/v1/auth/login   -H 'Content-Type: application/json'   -d '{"email":"alice@example.com","password":"Password123!"}'</div>
          </div>

          <!-- API CARD 2 -->
          <div class="api-card">
            <div class="api-card-top">
              <span class="api-method method-get">GET</span>
              <span class="api-path">/api/v1/workspaces</span>
              <button class="copy-pill" onclick="copySnippet(this, 'curl -s http://localhost:3001/api/v1/workspaces -H \\'authorization: Bearer $TOKEN\\'')">Copy curl</button>
            </div>
            <div class="api-snippet">curl -X GET http://localhost:3001/api/v1/workspaces   -H 'Authorization: Bearer &lt;session_token&gt;'</div>
          </div>

          <!-- API CARD 3 -->
          <div class="api-card">
            <div class="api-card-top">
              <span class="api-method method-get">GET</span>
              <span class="api-path">/health/readiness</span>
              <button class="copy-pill" onclick="copySnippet(this, 'curl -s http://localhost:3001/health/readiness')">Copy curl</button>
            </div>
            <div class="api-snippet">curl -s http://localhost:3001/health/readiness
# Returns: {"status":"ready","database":"connected","timestamp":"..."}</div>
          </div>

          <!-- API CARD 4 -->
          <div class="api-card">
            <div class="api-card-top">
              <span class="api-method method-get">GET</span>
              <span class="api-path">/metrics</span>
              <button class="copy-pill" onclick="copySnippet(this, 'curl -s http://localhost:3001/metrics')">Copy curl</button>
            </div>
            <div class="api-snippet">curl -s http://localhost:3001/metrics
# Prometheus http_request_duration_seconds histogram metrics</div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- FOOTER -->
  <footer class="page-footer">
    <div class="wrap">
      <div class="footer-inner">
        <a href="/" class="brand-link">
          <div class="brand-mark" style="width: 28px; height: 28px;">
            <img src="/favicon.svg" alt="Latch Mark">
          </div>
          <span class="brand-name" style="font-size: 15px;">Latch Platform</span>
        </a>

        <ul class="footer-links">
          <li><a href="/docs">OpenAPI Documentation</a></li>
          <li><a href="/health/readiness">Health Probe</a></li>
          <li><a href="/metrics">Prometheus Metrics</a></li>
          <li><a href="https://github.com/vbhvx/Latch" target="_blank" rel="noopener">GitHub Repository</a></li>
        </ul>
      </div>

      <div class="footer-baseline">
        <span>PostgreSQL 16 · Fastify 5 · TypeScript 5.8 · Strict Defense-in-Depth</span>
        <span>MIT License · Security First</span>
      </div>
    </div>
  </footer>

  <script>
    const scenarios = [
      {
        title: "1. Tenant Alice (Owner)",
        code: \`<span class="c-comment">-- 1. Atomic transaction starts with tenant context</span>
<span class="c-kw">BEGIN</span>;
<span class="c-kw">SELECT</span> <span class="c-fn">set_config</span>(<span class="c-str">'app.current_tenant_id'</span>, <span class="c-str">'1'</span>, <span class="c-kw">true</span>);

<span class="c-comment">-- 2. Query executed as latch_app (NOBYPASSRLS)</span>
<span class="c-kw">SELECT</span> id, title, status, version 
<span class="c-kw">FROM</span> tasks 
<span class="c-kw">WHERE</span> workspace_id = $1;

<span class="c-comment">-- Result: RLS policy grants access to Engineering Team</span>
<span class="c-hl">[
  {"id": 1, "title": "Implement PostgreSQL connection pool", "status": "in_progress", "version": 1},
  {"id": 2, "title": "Write automated authorization test cases", "status": "todo", "version": 1}
]</span>\`,
        statusClass: "status-200",
        statusText: "200 OK — 2 ROWS RETURNED (RLS PASS)"
      },
      {
        title: "2. Cross-Tenant Probe (Anti-Enumeration)",
        code: \`<span class="c-comment">-- 1. Attacker Bob probes Alice Private Workspace (id 2)</span>
<span class="c-kw">BEGIN</span>;
<span class="c-kw">SELECT</span> <span class="c-fn">set_config</span>(<span class="c-str">'app.current_tenant_id'</span>, <span class="c-str">'3'</span>, <span class="c-kw">true</span>);

<span class="c-comment">-- 2. Attacker attempts to fetch confidential task</span>
<span class="c-kw">SELECT</span> * <span class="c-kw">FROM</span> tasks <span class="c-kw">WHERE</span> id = 3 <span class="c-kw">AND</span> workspace_id = 2;

<span class="c-comment">-- Result: PostgreSQL RLS filters row; Policy raises 404 (NOT 403)</span>
<span class="c-hl">{
  "error": {
    "code": "NOT_FOUND",
    "message": "Task not found in this workspace.",
    "requestId": "req_84d7a8e2"
  }
}</span>\`,
        statusClass: "status-404",
        statusText: "404 NOT FOUND — ANTI-ENUMERATION ACTIVE"
      },
      {
        title: "3. Optimistic Concurrency Conflict",
        code: \`<span class="c-comment">-- 1. Client attempts update with stale version 1</span>
<span class="c-kw">UPDATE</span> tasks 
<span class="c-kw">SET</span> title = $1, version = version + 1 
<span class="c-kw">WHERE</span> id = 1 <span class="c-kw">AND</span> workspace_id = 1 <span class="c-kw">AND</span> version = 1;

<span class="c-comment">-- 2. Concurrency check: row was already updated to version 2</span>
<span class="c-comment">-- Rows affected: 0. Service rolls back transaction</span>
<span class="c-hl">{
  "error": {
    "code": "CONFLICT",
    "message": "Task was updated by another request. Refresh and retry.",
    "requestId": "req_19bc43f1"
  }
}</span>\`,
        statusClass: "status-409",
        statusText: "409 CONFLICT — CONCURRENT WRITE PREVENTED"
      },
      {
        title: "4. Live DB Connection Ping",
        code: \`<span class="c-comment">-- Direct HTTP ping to /health/readiness</span>
<span class="c-kw">GET</span> /health/readiness

<span class="c-comment">-- Active Pool Status: min: 2, max: 20</span>
<span class="c-hl">{
  "status": "ready",
  "database": "connected",
  "pool": {
    "total": 3,
    "idle": 2,
    "waiting": 0
  },
  "timestamp": "\${new Date().toISOString()}"
}</span>\`,
        statusClass: "status-200",
        statusText: "200 OK — POSTGRESQL POOL HEALTHY"
      }
    ];

    let currentIdx = 0;

    function selectScenario(idx) {
      currentIdx = idx;
      const tabs = document.querySelectorAll('.tab-btn');
      tabs.forEach((t, i) => t.classList.toggle('active', i === idx));
      const s = scenarios[idx];
      document.getElementById('codeConsole').innerHTML = s.code;
      const st = document.getElementById('resultStatus');
      st.className = 'status-pill ' + s.statusClass;
      document.getElementById('statusLabel').textContent = s.statusText;
    }

    async function runSimulation() {
      const btn = document.getElementById('runSimBtn');
      btn.style.opacity = '0.5';
      btn.querySelector('span').textContent = 'Executing...';
      
      if (currentIdx === 3) {
        try {
          const res = await fetch('/health/readiness');
          const data = await res.json();
          document.getElementById('codeConsole').innerHTML = \`<span class="c-comment">-- Live response from Fastify server:</span>\\n<span class="c-hl">\${JSON.stringify(data, null, 2)}</span>\`;
        } catch (e) {
          // Fallback if offline
        }
      }

      setTimeout(() => {
        btn.style.opacity = '1';
        btn.querySelector('span').textContent = 'Run Transaction';
      }, 350);
    }

    function copySnippet(btn, text) {
      navigator.clipboard.writeText(text);
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 1800);
    }

    // Initialize
    selectScenario(0);
  </script>
</body>
</html>`;
    return reply.status(200).type("text/html").send(html);
  });

  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <!-- Background Gradient: Deep Obsidian Void -->
    <linearGradient id="latch-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1224"/>
      <stop offset="60%" stop-color="#060913"/>
      <stop offset="100%" stop-color="#020307"/>
    </linearGradient>

    <!-- Outer Rim Stroke -->
    <linearGradient id="latch-rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.85"/>
      <stop offset="45%" stop-color="#0284c7" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#1e293b" stop-opacity="0.2"/>
    </linearGradient>

    <!-- Shackle Metallic Electric Azure -->
    <linearGradient id="latch-shackle" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7dd3fc"/>
      <stop offset="25%" stop-color="#38bdf8"/>
      <stop offset="70%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>

    <!-- Vault Chassis Body -->
    <linearGradient id="latch-body" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#15213b"/>
      <stop offset="40%" stop-color="#0e172a"/>
      <stop offset="100%" stop-color="#080c17"/>
    </linearGradient>

    <!-- Cryptographic Neon Core Glow -->
    <linearGradient id="latch-core" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>

    <!-- Subtle Ambient Radial Spotlight behind Lock -->
    <radialGradient id="latch-glow" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.3"/>
      <stop offset="70%" stop-color="#0284c7" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- 1. Obsidian Glass Squircle Base -->
  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#latch-bg)"/>
  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#latch-glow)"/>
  <rect x="2.5" y="2.5" width="59" height="59" rx="15.5" fill="none" stroke="url(#latch-rim)" stroke-width="1.25"/>

  <!-- 2. Hardened Shackle (The Latch Arch) -->
  <path d="M21.5 28 V19.5 C21.5 13.7 26.2 9 32 9 C37.8 9 42.5 13.7 42.5 19.5 V28"
        fill="none" stroke="url(#latch-shackle)" stroke-width="5" stroke-linecap="round"/>

  <!-- Shackle Inner Shadow / Depth Accent -->
  <path d="M21.5 24 V19.5 C21.5 14.5 25.5 10.5 30.5 10"
        fill="none" stroke="#bae6fd" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>

  <!-- Shackle Specular Highlight (The Crown Glint) -->
  <path d="M28 10.5 C29.3 9.8 30.6 9.5 32 9.5 C33.4 9.5 34.7 9.8 36 10.5"
        fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="0.95"/>

  <!-- 3. Lower Vault Block (Lock Chassis) -->
  <rect x="14" y="26" width="36" height="26" rx="7" fill="url(#latch-body)" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.55"/>

  <!-- High-Tech Machine Division Seam -->
  <line x1="14" y1="32.5" x2="50" y2="32.5" stroke="#1e293b" stroke-width="1"/>
  <line x1="22" y1="32.5" x2="42" y2="32.5" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.4"/>

  <!-- Dual Precision Mechanical Rivets / Torx Pins -->
  <circle cx="18.5" cy="30" r="1.2" fill="#38bdf8" opacity="0.8"/>
  <circle cx="45.5" cy="30" r="1.2" fill="#38bdf8" opacity="0.8"/>

  <!-- 4. Glowing Cryptographic Keyway / Latch Nexus -->
  <circle cx="32" cy="38" r="3.2" fill="url(#latch-core)"/>
  <path d="M30.6 39.5 L29.8 45.5 C29.7 46 30.1 46.5 30.7 46.5 H33.3 C33.9 46.5 34.3 46 34.2 45.5 L33.4 39.5 Z" fill="url(#latch-core)"/>
  <circle cx="32" cy="38" r="1.2" fill="#ffffff"/>

  <!-- 5. Active Security Latch Pulse Dot (Status: Locked & Verified) -->
  <circle cx="32" cy="49" r="0.9" fill="#34d399"/>
</svg>`;

  const faviconIcoBuffer = Buffer.from(
    "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",
    "base64"
  );

  const faviconPngBuffer = Buffer.from(
    "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",
    "base64"
  );

  app.get("/favicon.svg", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).type("image/svg+xml").send(faviconSvg);
  });

  app.get("/favicon-32x32.png", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).type("image/png").send(faviconPngBuffer);
  });

  app.get("/favicon.ico", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).type("image/x-icon").send(faviconIcoBuffer);
  });
}
