import { describe, it, expect, beforeEach } from "vitest";
import { pool } from "../../src/db/pool.js";
import { resetTestDatabase } from "../setup.js";
import { userRepository } from "../../src/repositories/user.repository.js";
import { workspaceRepository } from "../../src/repositories/workspace.repository.js";
import { taskRepository } from "../../src/repositories/task.repository.js";

describe("Integration: Parameterized SQL & Injection Safeguards", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("should treat SQL injection payloads as literal text strings without syntax interpretation", async () => {
    const user = await userRepository.createUser(pool, {
      email: "safe@example.com",
      display_name: "Safe User",
      password_hash: "hash",
    });

    const ws = await workspaceRepository.createWorkspace(pool, "SQL Injection Test WS", user.id);

    const maliciousTitle = "'; DROP TABLE tasks; --";
    const maliciousDescription = "' OR '1'='1";

    const created = await taskRepository.createTask(pool, {
      workspace_id: ws.id,
      owner_id: user.id,
      title: maliciousTitle,
      description: maliciousDescription,
    });

    expect(created.title).toBe(maliciousTitle);
    expect(created.description).toBe(maliciousDescription);

    // Verify tasks table was NOT dropped!
    const retrieved = await taskRepository.findById(pool, created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe(maliciousTitle);
  });

  it("should safely filter tasks when search query contains SQL clauses", async () => {
    const user = await userRepository.createUser(pool, {
      email: "search@example.com",
      display_name: "Search User",
      password_hash: "hash",
    });

    const ws = await workspaceRepository.createWorkspace(pool, "Search WS", user.id);
    await taskRepository.createTask(pool, {
      workspace_id: ws.id,
      owner_id: user.id,
      title: "Legitimate Task Alpha",
    });

    // Malicious search string attempting tautology attack
    const { tasks } = await taskRepository.findTasks(pool, {
      workspaceId: ws.id,
      search: "' OR '1'='1",
    });

    // The search ILIKE will look for literal %' OR '1'='1% and match nothing
    expect(tasks).toHaveLength(0);
  });
});

