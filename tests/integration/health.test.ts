import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";

describe("Integration: Health & Readiness Endpoints", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should respond 200 on liveness probe", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health/liveness",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(body.timestamp).toBeDefined();
  });

  it("should respond 200 on readiness probe when database is healthy", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health/readiness",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ready");
    expect(body.database).toBe("connected");
    expect(body.timestamp).toBeDefined();
    // Verify no internal passwords or topologies are exposed
    expect(body.password).toBeUndefined();
    expect(body.connectionString).toBeUndefined();
  });
});
