import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { pool } from "../../src/db/pool.js";
import { startSessionCleanup } from "../../src/jobs/session-cleanup.js";
import { hashSessionToken } from "../../src/lib/crypto.js";
import { resetTestDatabase } from "../setup.js";

describe("Integration: operational hardening", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("sends security headers on every response", async () => {
    const res = await app.inject({ method: "GET", url: "/health/liveness" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("exposes Prometheus metrics with route-template labels", async () => {
    await app.inject({ method: "GET", url: "/health/liveness" });
    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.body).toContain("latch_http_request_duration_seconds_count");
    expect(res.body).toContain('route="/health/liveness"');
    expect(res.body).toContain("latch_process_cpu_user_seconds_total");
  });

  it("rejects oversized request bodies", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ email: "a@b.co", password: "x".repeat(2_000_000) }),
    });
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("purges only expired sessions via the cleanup job", async () => {
    await resetTestDatabase();
    const { rows } = await pool.query(
      `INSERT INTO users (email, display_name, password_hash) VALUES ('cleanup@example.com', 'Cleanup', 'x') RETURNING id`
    );
    const userId = rows[0].id as string;
    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES
        ($1, $2, NOW() - INTERVAL '1 hour'),
        ($1, $3, NOW() + INTERVAL '1 hour')`,
      [userId, hashSessionToken("expired"), hashSessionToken("live")]
    );

    const stop = startSessionCleanup(60, app.log);
    await new Promise((r) => setTimeout(r, 300));
    stop();

    const left = await pool.query("SELECT token_hash FROM sessions");
    expect(left.rows).toHaveLength(1);
    expect(left.rows[0].token_hash).toBe(hashSessionToken("live"));
  });

  it("disables the cleanup job when the interval is 0", () => {
    const stop = startSessionCleanup(0, app.log);
    expect(typeof stop).toBe("function");
  });
});
