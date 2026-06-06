import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "../../src/app.js";
import { resetTestDatabase } from "../setup.js";
import { pool } from "../../src/db/pool.js";
import { taskRepository } from "../../src/repositories/task.repository.js";
import type { FastifyInstance } from "fastify";

describe("Security: Centralized Authorization & RBAC Boundaries", () => {
  let app: FastifyInstance;

  // Test identities
  let ownerToken: string;
  let memberToken: string;
  let viewerToken: string;
  let outsiderToken: string;

  let ownerId: string;
  let memberId: string;
  let viewerId: string;

  let workspaceId: string;
  let ownerTaskId: string;

  beforeEach(async () => {
    await resetTestDatabase();
    app = buildApp();
    await app.ready();

    // 1. Register User A (Workspace Owner)
    const resA = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "owner@example.com", displayName: "Owner", password: "Password123!" },
    });
    ownerToken = resA.json().sessionToken;
    ownerId = resA.json().user.id;

    // 2. Register User B (Member)
    const resB = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "member@example.com", displayName: "Member", password: "Password123!" },
    });
    memberToken = resB.json().sessionToken;
    memberId = resB.json().user.id;

    // 3. Register User C (Viewer)
    const resC = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "viewer@example.com", displayName: "Viewer", password: "Password123!" },
    });
    viewerToken = resC.json().sessionToken;
    viewerId = resC.json().user.id;

    // 4. Register User D (Outsider / Attacker)
    const resD = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "outsider@example.com", displayName: "Outsider", password: "Password123!" },
    });
    outsiderToken = resD.json().sessionToken;

    // Create Shared Workspace as Owner
    const wsRes = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: "Engineering Core" },
    });
    workspaceId = wsRes.json().workspace.id;

    // Add Member and Viewer to Engineering Core
    await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/members`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { userId: memberId, role: "member" },
    });

    await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/members`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { userId: viewerId, role: "viewer" },
    });

    // Create a Task as Owner
    const taskRes = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        workspaceId,
        title: "Owner Confidential Strategy",
        description: "Initial strategy details",
        status: "todo",
      },
    });
    ownerTaskId = taskRes.json().task.id;
  });

  afterEach(async () => {
    await app.close();
  });

  describe("Cross-Tenant Isolation & ID Manipulation Attacks", () => {
    it("should prevent outsider from reading, modifying, or deleting workspace tasks (returns 404)", async () => {
      // 1. Attempt Read
      const readRes = await app.inject({
        method: "GET",
        url: `/api/v1/tasks/${ownerTaskId}`,
        headers: { authorization: `Bearer ${outsiderToken}` },
      });
      expect(readRes.statusCode).toBe(404);

      // 2. Attempt Modify
      const modifyRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/tasks/${ownerTaskId}`,
        headers: { authorization: `Bearer ${outsiderToken}` },
        payload: { title: "Tampered by outsider", version: 1 },
      });
      expect(modifyRes.statusCode).toBe(404);

      // 3. Attempt Delete
      const deleteRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/tasks/${ownerTaskId}`,
        headers: { authorization: `Bearer ${outsiderToken}` },
      });
      expect(deleteRes.statusCode).toBe(404);

      // 4. Verify the database record remains completely unchanged!
      const preserved = await taskRepository.findById(pool, ownerTaskId);
      expect(preserved).not.toBeNull();
      expect(preserved?.title).toBe("Owner Confidential Strategy");
      expect(preserved?.version).toBe(1);
    });

    it("should not leak tasks of other workspaces in list endpoints", async () => {
      const listRes = await app.inject({
        method: "GET",
        url: "/api/v1/tasks",
        headers: { authorization: `Bearer ${outsiderToken}` },
      });

      expect(listRes.statusCode).toBe(200);
      const tasks = listRes.json().tasks;
      // Outsider should only see their own tasks, never tasks from Engineering Core
      const leaked = tasks.some((t: any) => t.id === ownerTaskId);
      expect(leaked).toBe(false);
    });
  });

  describe("Viewer Role Boundaries", () => {
    it("should allow viewer to read tasks in their workspace", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/tasks/${ownerTaskId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().task.title).toBe("Owner Confidential Strategy");
    });

    it("should reject viewer from creating tasks (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/tasks",
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: {
          workspaceId,
          title: "Viewer unauthorized task",
          status: "todo",
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN");
    });

    it("should reject viewer from modifying tasks (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/tasks/${ownerTaskId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: {
          title: "Viewer altered title",
          version: 1,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN");

      // Verify unchanged
      const current = await taskRepository.findById(pool, ownerTaskId);
      expect(current?.title).toBe("Owner Confidential Strategy");
    });

    it("should reject viewer from deleting tasks (403 Forbidden)", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/tasks/${ownerTaskId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN");

      // Verify task still active
      const current = await taskRepository.findById(pool, ownerTaskId);
      expect(current?.deleted_at).toBeNull();
    });
  });

  describe("Member Role Capabilities & Deletion Limits", () => {
    it("should allow member to create and update tasks", async () => {
      // 1. Create
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/tasks",
        headers: { authorization: `Bearer ${memberToken}` },
        payload: {
          workspaceId,
          title: "Member Task",
          status: "todo",
        },
      });
      expect(createRes.statusCode).toBe(201);
      const memberTaskId = createRes.json().task.id;

      // 2. Update
      const updateRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/tasks/${memberTaskId}`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: {
          title: "Member Task Updated",
          version: 1,
        },
      });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.json().task.version).toBe(2);

      // 3. Delete their own task
      const delRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/tasks/${memberTaskId}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });
      expect(delRes.statusCode).toBe(200);
    });

    it("should prevent member from deleting a task owned by another user (403)", async () => {
      const delRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/tasks/${ownerTaskId}`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(delRes.statusCode).toBe(403);
      expect(delRes.json().error.code).toBe("FORBIDDEN");

      // Task remains active in DB
      const current = await taskRepository.findById(pool, ownerTaskId);
      expect(current?.deleted_at).toBeNull();
    });

    it("should allow workspace owner to delete any task in the workspace", async () => {
      // Member creates a task
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/tasks",
        headers: { authorization: `Bearer ${memberToken}` },
        payload: {
          workspaceId,
          title: "Task by member",
          status: "todo",
        },
      });
      const memberTaskId = createRes.json().task.id;

      // Owner deletes member's task
      const delRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/tasks/${memberTaskId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      expect(delRes.statusCode).toBe(200);

      // Verify soft-deleted
      const current = await taskRepository.findById(pool, memberTaskId);
      expect(current).toBeNull(); // findById excludes soft-deleted tasks
    });
  });

  describe("Privilege Escalation & Administrative Boundaries", () => {
    it("should prevent member from promoting themselves or others to owner (403)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/workspaces/${workspaceId}/members/${memberId}`,
        headers: { authorization: `Bearer ${memberToken}` },
        payload: { role: "owner" },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN");
    });

    it("should prevent member from viewing workspace audit logs (403)", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${workspaceId}/audit-events`,
        headers: { authorization: `Bearer ${memberToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN");
    });

    it("should allow workspace owner to view workspace audit logs", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${workspaceId}/audit-events`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const events = res.json().events;
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    it("should prevent demoting or removing the sole owner of a workspace (409 Conflict)", async () => {
      const demoteRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/workspaces/${workspaceId}/members/${ownerId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { role: "member" },
      });

      expect(demoteRes.statusCode).toBe(409);
      expect(demoteRes.json().error.code).toBe("CONFLICT");

      const removeRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/workspaces/${workspaceId}/members/${ownerId}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(removeRes.statusCode).toBe(409);
      expect(removeRes.json().error.code).toBe("CONFLICT");
    });
  });
});
