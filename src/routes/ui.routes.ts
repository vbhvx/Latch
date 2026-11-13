import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function uiRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
    const html = `<!DOCTYPE html>
<html lang="en" data-type="software" data-radius="sharp">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="page-type" content="software">
  <meta name="site-kind" content="software">
  <title>Latch — Security-First PostgreSQL Developer Platform</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" href="/favicon.ico">
  <style>
    :root {
      --bg: #090d16;
      --surface: #0f172a;
      --surface-hover: #1e293b;
      --border: #1e293b;
      --border-lit: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --dim: #64748b;
      --accent: #38bdf8;
      --emerald: #10b981;
      --emerald-subtle: rgba(16, 185, 129, 0.12);
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
      --m-in: 150ms;
      --m-out: 120ms;
      --m-press: 90ms;
      --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      padding-bottom: 64px;
    }
    .wrap {
      max-width: 1120px;
      margin: 0 auto;
      padding: 0 24px;
    }
    header {
      border-bottom: 1px solid var(--border);
      background: rgba(9, 13, 22, 0.85);
      backdrop-filter: blur(8px);
      position: sticky;
      top: 0;
      z-index: 20;
    }
    .nav-inner {
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
    }
    .brand-mark {
      width: 32px;
      height: 32px;
      background: #0284c7;
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      font-family: var(--font-mono);
    }
    .brand-title {
      font-weight: 700;
      font-size: 16px;
      letter-spacing: -0.02em;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: var(--font-mono);
    }
    .badge-live {
      background: var(--emerald-subtle);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 8px var(--emerald);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      text-decoration: none;
      cursor: pointer;
      transition: transform var(--m-out) var(--ease), background var(--m-out) var(--ease), border var(--m-out) var(--ease);
      border: 1px solid transparent;
    }
    .btn:hover { transform: translateY(-1px); }
    .btn:active { transform: translateY(1px) scale(0.99); transition-duration: var(--m-press); }
    .btn-primary { background: #0284c7; color: #ffffff; }
    .btn-primary:hover { background: #0369a1; }
    .btn-ghost { background: transparent; color: var(--muted); border-color: var(--border); }
    .btn-ghost:hover { background: var(--surface); color: var(--text); border-color: var(--border-lit); }
    
    .hero {
      padding: 64px 0 48px;
    }
    .h1-title {
      font-size: 38px;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin-bottom: 16px;
    }
    .lead {
      color: var(--muted);
      font-size: 17px;
      max-width: 680px;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-top: 32px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
      transition: transform var(--m-in) var(--ease), border-color var(--m-in) var(--ease), box-shadow var(--m-in) var(--ease);
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: var(--border-lit);
      box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.4);
    }
    .card-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--dim);
      font-family: var(--font-mono);
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .card-desc {
      font-size: 13px;
      color: var(--muted);
      line-height: 1.5;
    }
    .terminal-box {
      background: #040711;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      margin-top: 32px;
      font-family: var(--font-mono);
      font-size: 13px;
    }
    .terminal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #141c2e;
      padding-bottom: 12px;
      margin-bottom: 16px;
      color: var(--dim);
      font-size: 11px;
    }
    .code-line {
      display: flex;
      gap: 12px;
      color: #38bdf8;
      overflow-x: auto;
      padding: 4px 0;
    }
    .code-prompt { color: #64748b; user-select: none; }
  </style>
</head>
<body>
  <header>
    <div class="wrap nav-inner">
      <a href="/" class="brand">
        <div class="brand-mark">LT</div>
        <span class="brand-title">Latch Platform</span>
      </a>
      <div style="display: flex; align-items: center; gap: 16px;">
        <div class="badge badge-live">
          <div class="pulse-dot"></div>
          <span>PG POOL ACTIVE</span>
        </div>
        <a href="/docs" class="btn btn-primary">Open API Documentation</a>
      </div>
    </div>
  </header>

  <main class="wrap">
    <section class="hero">
      <h1 class="h1-title">Security-first backend platform on PostgreSQL</h1>
      <p class="lead">
        Enforced boundaries, cryptographic session validation, isolated multi-tenant workspaces, and strict RBAC policies directly in PostgreSQL transactions.
      </p>
      <div style="display: flex; gap: 12px;">
        <a href="/docs" class="btn btn-primary">Inspect OpenAPI Endpoints</a>
        <a href="/health/readiness" class="btn btn-ghost">Check Health Readiness</a>
      </div>
    </section>

    <div class="grid-3">
      <div class="card">
        <div class="card-label">Relational Engine</div>
        <div class="card-value">PostgreSQL 16</div>
        <div class="card-desc">Parameterized query repository pattern with atomic rollbacks, zero SQL injection surface, and strict migration locks.</div>
      </div>
      <div class="card">
        <div class="card-label">Identity & Access</div>
        <div class="card-value">Role-Based RBAC</div>
        <div class="card-desc">Hierarchical permissions (OWNER, ADMIN, MEMBER, VIEWER) validated before entering execution handlers.</div>
      </div>
      <div class="card">
        <div class="card-label">Runtime Performance</div>
        <div class="card-value">Fastify HTTP</div>
        <div class="card-desc">Low overhead HTTP foundation with asynchronous JSON serialization and rate-limiting enforcement.</div>
      </div>
    </div>

    <div class="terminal-box">
      <div class="terminal-header">
        <span>VERIFY BACKEND CONNECTIVITY</span>
        <span>CURL TEST HARNESS</span>
      </div>
      <div class="code-line">
        <span class="code-prompt">$</span>
        <span>curl -s -X GET http://localhost:3000/health/readiness | jq .</span>
      </div>
      <div class="code-line" style="color: #10b981; margin-top: 4px;">
        <span class="code-prompt">&gt;</span>
        <span>{"status":"ready","database":"connected","timestamp":"2026-11-10T15:29:00.000Z"}</span>
      </div>
    </div>
  </main>
</body>
</html>`;
    return reply.status(200).type("text/html").send(html);
  });

  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs><linearGradient id="lt-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#040711"/></linearGradient><linearGradient id="lt-border" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9"/><stop offset="100%" stop-color="#0369a1" stop-opacity="0.3"/></linearGradient><linearGradient id="lt-accent" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0284c7"/></linearGradient><filter id="lt-glow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#38bdf8" flood-opacity="0.4"/></filter></defs><rect x="3" y="3" width="58" height="58" rx="16" fill="url(#lt-bg)" stroke="url(#lt-border)" stroke-width="1.5"/><g filter="url(#lt-glow)"><path d="M24 28 V22 C24 17.58 27.58 14 32 14 C36.42 14 40 17.58 40 22 V28" fill="none" stroke="url(#lt-accent)" stroke-width="4" stroke-linecap="round"/><rect x="20" y="28" width="24" height="20" rx="5" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/><circle cx="32" cy="36" r="2.5" fill="#ffffff"/><path d="M31 36.5 L30.5 42 H33.5 L33 36.5 Z" fill="#ffffff"/></g></svg>`;

  const faviconIcoBuffer = Buffer.from(
    "AAABAAEAICAAAAEAIACEAwAAFgAAAIlQTkcNChoKAAAADUlIRFIAAAAgAAAAIAgGAAAAc3p69AAAAARnQU1BAACxjwv8YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAABm2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyI+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj42NDwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj42NDwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgqbek1aAAABGElEQVRYCe3TP0sDMRzG8W/indijgpaKRaRXLOUUigiKDg6uDm7uDm4uLr4NRwcXJxEnfQHq4B8onKUubq7iIi6CoDR3+Xn1BXS7c8kzJpDnlw+JsiJyeffE9X2MsgabpiwutNjd3qQ06pF7Lm57UgmXpVSNpLKxI0G4IiNBTQ6PT7PR8o++enjk6/2NcnsVv1bHby2R9vt04zj3yw8KtBaLVmBmIibWt/CjNfB8VLZeRLRNDJKV2bEywdQsenwSlMImSRH9eO35JgZNenPG80sP+XiF70/qjbCQAdSPSeTo5Jxup/P3C1IrNJpzHOzvMV3NNHKOGrzznDuGHq+H7haw6QZwAk7ACTgBJ+AEnIATcAJO4N8FfgHTRrnwz5tC7QAAAABJRU5ErkJggg==",
    "base64"
  );

  app.get("/favicon.svg", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).type("image/svg+xml").send(faviconSvg);
  });

  app.get("/favicon.ico", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).type("image/x-icon").send(faviconIcoBuffer);
  });
}

