import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../../src/app.js";
import { resetTestDatabase } from "../setup.js";
import { pool } from "../../src/db/pool.js";
import { userRepository } from "../../src/repositories/user.repository.js";
import type { FastifyInstance } from "fastify";

describe("Security: Authentication & Session Lifecycle", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    await resetTestDatabase();
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should register a new account and return session without exposing password hash", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "alice@example.com",
        displayName: "Alice Smith",
        password: "SuperSecurePassword123!",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe("alice@example.com");
    expect(body.user.display_name).toBe("Alice Smith");
    expect(body.user.password_hash).toBeUndefined(); // NEVER EXPOSED
    expect(body.sessionToken).toBeDefined();

    // Verify session cookie was set
    const cookies = res.cookies;
    const sessionCookie = cookies.find((c) => c.name === "latch_session");
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe("Lax");
  });

  it("should reject registration with duplicate email with 409 Conflict", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "bob@example.com",
        displayName: "Bob",
        password: "Password123!",
      },
    });

    const duplicateRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "BOB@EXAMPLE.COM", // case insensitive match
        displayName: "Bob 2",
        password: "Password123!",
      },
    });

    expect(duplicateRes.statusCode).toBe(409);
    const body = duplicateRes.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("should login with correct credentials and issue valid session token", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "charlie@example.com",
        displayName: "Charlie",
        password: "CorrectPassword123!",
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "charlie@example.com",
        password: "CorrectPassword123!",
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const body = loginRes.json();
    expect(body.user.email).toBe("charlie@example.com");
    expect(body.sessionToken).toBeDefined();
  });

  it("should reject login with wrong password (401 Unauthenticated)", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "dave@example.com",
        displayName: "Dave",
        password: "CorrectPassword123!",
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "dave@example.com",
        password: "WrongPassword999!",
      },
    });

    expect(loginRes.statusCode).toBe(401);
    expect(loginRes.json().error.code).toBe("UNAUTHENTICATED");
  });

  it("should reject access to protected endpoints when unauthenticated (401)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me",
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHENTICATED");
  });

  it("should allow access with Authorization Bearer token or latch_session cookie", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "eve@example.com",
        displayName: "Eve",
        password: "Password123!",
      },
    });
    const { sessionToken } = regRes.json();

    // 1. With Bearer token
    const bearerRes = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });
    expect(bearerRes.statusCode).toBe(200);
    expect(bearerRes.json().user.email).toBe("eve@example.com");

    // 2. With Cookie
    const cookieRes = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      cookies: {
        latch_session: sessionToken,
      },
    });
    expect(cookieRes.statusCode).toBe(200);
    expect(cookieRes.json().user.email).toBe("eve@example.com");
  });

  it("should invalidate session upon logout and reject subsequent requests", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "frank@example.com",
        displayName: "Frank",
        password: "Password123!",
      },
    });
    const { sessionToken } = regRes.json();

    // Logout
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });
    expect(logoutRes.statusCode).toBe(200);

    // Verify subsequent access with revoked token is rejected
    const testRes = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });
    expect(testRes.statusCode).toBe(401);
  });

  it("should deny authentication if user account is deactivated", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "suspended@example.com",
        displayName: "Suspended",
        password: "Password123!",
      },
    });
    const { user } = regRes.json();

    // Deactivate user in database
    await userRepository.updateStatus(pool, user.id, "deactivated");

    // Attempt login
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "suspended@example.com",
        password: "Password123!",
      },
    });
    expect(loginRes.statusCode).toBe(403);
    expect(loginRes.json().error.code).toBe("FORBIDDEN");
  });
});

