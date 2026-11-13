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
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      overflow: hidden;
      filter: drop-shadow(0 2px 8px rgba(56, 189, 248, 0.35));
      transition: transform var(--m-out) var(--ease), filter var(--m-out) var(--ease);
    }
    .brand-mark img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .brand:hover .brand-mark {
      transform: scale(1.06);
      filter: drop-shadow(0 4px 14px rgba(56, 189, 248, 0.55));
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
        <div class="brand-mark">
          <img src="/favicon.svg" alt="Latch Logo">
        </div>
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
    "AAABAAEAICAAAAEAIAAoEQAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////z7+v/7+/r/+vr6//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////X08v94b2n/Qzky/0I5NP8/NzL/R0JB/8XDwv//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////rqad/xUFAP8kFAb/KyUI/yQXBv8VCAD/RkA///39/f////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+Xi3z/JBID/yYTDP9bWyL/MiUS/ycVB/89NTH/+/v7/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////5uOff8nFAT/UDMV/0wzF/9NMRX/NyEJ/0A4M//7+/r/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////oZOA/xgHAP+RbCn/Ry4M/3RLB/8yHAD/PjQw//z8+//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Wz8P/KRcK/1Y8Gv+Vdjz/dE8P/xECAP94b2n////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Wz8P/npF//6qbg/+aj37/rqad//b18///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
    "base64"
  );

  app.get("/favicon.svg", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).type("image/svg+xml").send(faviconSvg);
  });

  app.get("/favicon.ico", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).type("image/x-icon").send(faviconIcoBuffer);
  });
}
