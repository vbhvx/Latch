import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../../src/app.js";
import type { FastifyInstance } from "fastify";

describe("Integration: Error Handler & Sanitization", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should return sanitized 404 error envelope on non-existent endpoints", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/non-existent-route",
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body).toHaveProperty("error");
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Endpoint not found.");
    expect(body.error.requestId).toMatch(/^req_/);
  });

  it("should preserve incoming x-request-id in error responses", async () => {
    const customReqId = "req_custom_trace_987654";
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/non-existent-route",
      headers: {
        "x-request-id": customReqId,
      },
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error.requestId).toBe(customReqId);
  });
});

describe("Integration: Fastify client errors are not reported as server errors", () => {
  it("returns 400 BAD_REQUEST for malformed JSON", async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json" },
      payload: "{not json",
    });
    await app.close();
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("BAD_REQUEST");
  });
});

describe("Integration: validation error codes", () => {
  it("distinguishes missing fields (REQUIRED) from wrong types (INVALID_TYPE)", async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "a@b.co", displayName: 123 },
    });
    await app.close();
    expect(res.statusCode).toBe(400);
    const byField = Object.fromEntries(
      res.json().error.details.map((d: { field: string; code: string }) => [d.field, d.code])
    );
    expect(byField.password).toBe("REQUIRED");
    expect(byField.displayName).toBe("INVALID_TYPE");
  });
});
