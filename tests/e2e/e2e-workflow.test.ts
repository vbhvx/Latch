import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../../src/app.js";
import { resetTestDatabase } from "../setup.js";
import { pool } from "../../src/db/pool.js";
import { taskRepository } from "../../src/repositories/task.repository.js";
import type { FastifyInstance } from "fastify";

describe("E2E: Section 15.7 End-to-End Security & Resource Lifecycle Workflow", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    await resetTestDatabase();
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should faithfully execute the complete 10-step representative security sequence", async () => {
    // -------------------------------------------------------------
    // Step 1: Provision two test users (User A & User B)
    // -------------------------------------------------------------
    const regResA = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "alice_e2e@example.com",
        displayName: "Alice E2E",
        password: "Password123!",
      },
    });
    expect(regResA.statusCode).toBe(201);
    const tokenA = regResA.json().sessionToken;

    const regResB = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "bob_e2e@example.com",
        displayName: "Bob E2E",
        password: "Password123!",
      },
    });
    expect(regResB.statusCode).toBe(201);
    const tokenB = regResB.json().sessionToken;

    // -------------------------------------------------------------
    // Step 2: Authenticate both users (Verified valid sessions)
    // -------------------------------------------------------------
    const meResA = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(meResA.statusCode).toBe(200);
    expect(meResA.json().user.email).toBe("alice_e2e@example.com");

    const meResB = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(meResB.statusCode).toBe(200);
    expect(meResB.json().user.email).toBe("bob_e2e@example.com");

    // -------------------------------------------------------------
    // Step 3: Create a resource as User A (Workspace + Task)
    // -------------------------------------------------------------
    const wsRes = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: "Alice Secure Workspace" },
    });
    expect(wsRes.statusCode).toBe(201);
    const workspaceA = wsRes.json().workspace;

    const taskRes = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        workspaceId: workspaceA.id,
        title: "Alice Private Financial Forecast",
        description: "Confidential financial projection",
        status: "in_progress",
      },
    });
    expect(taskRes.statusCode).toBe(201);
    const taskA = taskRes.json().task;
    expect(taskA.title).toBe("Alice Private Financial Forecast");
    expect(taskA.version).toBe(1);

    // -------------------------------------------------------------
    // Step 4: Retrieve it as User A
    // -------------------------------------------------------------
    const retrieveResA = await app.inject({
      method: "GET",
      url: `/api/v1/tasks/${taskA.id}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(retrieveResA.statusCode).toBe(200);
    expect(retrieveResA.json().task.id).toBe(taskA.id);

    // -------------------------------------------------------------
    // Step 5: Attempt to retrieve it as User B
    // -------------------------------------------------------------
    const retrieveResB = await app.inject({
      method: "GET",
      url: `/api/v1/tasks/${taskA.id}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });

    // -------------------------------------------------------------
    // Step 6: Attempt to modify it as User B
    // -------------------------------------------------------------
    const modifyResB = await app.inject({
      method: "PATCH",
      url: `/api/v1/tasks/${taskA.id}`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: {
        title: "Bob Injected Title",
        version: 1,
      },
    });

    // -------------------------------------------------------------
    // Step 7: Verify that both unauthorized operations are rejected
    // -------------------------------------------------------------
    // User B receives 404 to avoid leaking resource existence
    expect(retrieveResB.statusCode).toBe(404);
    expect(retrieveResB.json().error.code).toBe("NOT_FOUND");

    expect(modifyResB.statusCode).toBe(404);
    expect(modifyResB.json().error.code).toBe("NOT_FOUND");

    // -------------------------------------------------------------
    // Step 8: Verify that the database record remains completely unchanged
    // -------------------------------------------------------------
    const persistentRecord = await taskRepository.findById(pool, taskA.id);
    expect(persistentRecord).not.toBeNull();
    expect(persistentRecord?.title).toBe("Alice Private Financial Forecast");
    expect(persistentRecord?.version).toBe(1);
    expect(persistentRecord?.deleted_at).toBeNull();

    // -------------------------------------------------------------
    // Step 9: Log out User A and verify revoked session cannot read resource
    // -------------------------------------------------------------
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(logoutRes.statusCode).toBe(200);

    const postLogoutRead = await app.inject({
      method: "GET",
      url: `/api/v1/tasks/${taskA.id}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(postLogoutRead.statusCode).toBe(401);
    expect(postLogoutRead.json().error.code).toBe("UNAUTHENTICATED");

    // -------------------------------------------------------------
    // Step 10: Confirm that error responses match the documented API contract
    // -------------------------------------------------------------
    expect(postLogoutRead.json()).toHaveProperty("error");
    expect(postLogoutRead.json().error).toHaveProperty("code", "UNAUTHENTICATED");
    expect(postLogoutRead.json().error).toHaveProperty("message");
    expect(postLogoutRead.json().error).toHaveProperty("requestId");
    expect(postLogoutRead.json().error.requestId).toMatch(/^req_/);
  });
});
