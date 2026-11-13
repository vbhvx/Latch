import { describe, it, expect, beforeEach } from "vitest";
import { pool } from "../../src/db/pool.js";
import { resetTestDatabase } from "../setup.js";
import { userRepository } from "../../src/repositories/user.repository.js";
import { workspaceRepository } from "../../src/repositories/workspace.repository.js";

describe("Integration: PostgreSQL Database Constraints & Integrity", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("should enforce case-insensitive email uniqueness constraint on users", async () => {
    await userRepository.createUser(pool, {
      email: "engineer@example.com",
      display_name: "Engineer",
      password_hash: "hash_placeholder",
    });

    // Attempt to insert duplicate email with different case
    await expect(
      userRepository.createUser(pool, {
        email: "ENGINEER@EXAMPLE.COM",
        display_name: "Engineer Duplicate",
        password_hash: "hash_placeholder_2",
      })
    ).rejects.toThrow();
  });

  it("should enforce foreign key constraints on tasks", async () => {
    const fakeUuid = "99999999-9999-4999-a999-999999999999";

    // Attempt to insert task referencing non-existent workspace and user
    await expect(
      pool.query(
        `INSERT INTO tasks (workspace_id, owner_id, title)
         VALUES ($1, $2, 'Impossible Task')`,
        [fakeUuid, fakeUuid]
      )
    ).rejects.toThrow();
  });

  it("should enforce check constraints on task status", async () => {
    const user = await userRepository.createUser(pool, {
      email: "user@example.com",
      display_name: "User",
      password_hash: "hash",
    });

    const ws = await workspaceRepository.createWorkspace(pool, "Test Workspace", user.id);

    // Valid statuses: 'todo', 'in_progress', 'done'
    // Attempting invalid status
    await expect(
      pool.query(
        `INSERT INTO tasks (workspace_id, owner_id, title, status)
         VALUES ($1, $2, 'Invalid Task', 'random_unsupported_status')`,
        [ws.id, user.id]
      )
    ).rejects.toThrow();
  });

  it("should enforce unique constraint on workspace memberships (workspace_id, user_id)", async () => {
    const user = await userRepository.createUser(pool, {
      email: "user@example.com",
      display_name: "User",
      password_hash: "hash",
    });

    const ws = await workspaceRepository.createWorkspace(pool, "Test Workspace", user.id);
    await workspaceRepository.createMembership(pool, ws.id, user.id, "owner");

    // Attempt duplicate membership
    await expect(workspaceRepository.createMembership(pool, ws.id, user.id, "member")).rejects.toThrow();
  });

  it("should enforce check constraints preventing blank workspace names and task titles", async () => {
    const user = await userRepository.createUser(pool, {
      email: "user@example.com",
      display_name: "User",
      password_hash: "hash",
    });

    // Blank workspace name
    await expect(
      pool.query(`INSERT INTO workspaces (name, created_by) VALUES ('   ', $1)`, [user.id])
    ).rejects.toThrow();

    const ws = await workspaceRepository.createWorkspace(pool, "Valid Workspace", user.id);

    // Blank task title
    await expect(
      pool.query(`INSERT INTO tasks (workspace_id, owner_id, title) VALUES ($1, $2, '   ')`, [ws.id, user.id])
    ).rejects.toThrow();
  });
});
