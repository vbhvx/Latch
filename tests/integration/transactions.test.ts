import { describe, it, expect, beforeEach } from "vitest";
import { pool } from "../../src/db/pool.js";
import { withTransaction } from "../../src/db/transaction.js";
import { resetTestDatabase } from "../setup.js";
import { userRepository } from "../../src/repositories/user.repository.js";
import { workspaceRepository } from "../../src/repositories/workspace.repository.js";
import { taskRepository } from "../../src/repositories/task.repository.js";

describe("Integration: Transaction Management & Atomic Rollback", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("should commit multi-step operations together when all steps succeed", async () => {
    const user = await userRepository.createUser(pool, {
      email: "tx@example.com",
      display_name: "Tx User",
      password_hash: "hash",
    });

    const result = await withTransaction(pool, async (client) => {
      const ws = await workspaceRepository.createWorkspace(client, "Tx Workspace", user.id);
      const membership = await workspaceRepository.createMembership(client, ws.id, user.id, "owner");
      const task = await taskRepository.createTask(client, {
        workspace_id: ws.id,
        owner_id: user.id,
        title: "Atomic Task",
      });

      return { ws, membership, task };
    });

    // Verify all records exist in persistent storage outside the transaction
    const savedWs = await workspaceRepository.findById(pool, result.ws.id);
    const savedTask = await taskRepository.findById(pool, result.task.id);

    expect(savedWs).not.toBeNull();
    expect(savedTask).not.toBeNull();
  });

  it("should completely roll back all changes if an error occurs midway through the transaction", async () => {
    const user = await userRepository.createUser(pool, {
      email: "rollback@example.com",
      display_name: "Rollback User",
      password_hash: "hash",
    });

    let generatedWorkspaceId = "";

    await expect(
      withTransaction(pool, async (client) => {
        // Step 1: Create workspace (succeeds)
        const ws = await workspaceRepository.createWorkspace(client, "Rollback Workspace", user.id);
        generatedWorkspaceId = ws.id;

        // Step 2: Create task (succeeds)
        await taskRepository.createTask(client, {
          workspace_id: ws.id,
          owner_id: user.id,
          title: "Temporary Task",
        });

        // Step 3: Trigger an intentional failure (simulating a crash or unhandled constraint violation)
        throw new Error("Simulated critical downstream failure");
      })
    ).rejects.toThrow("Simulated critical downstream failure");

    // Verify that NO partial records were left in PostgreSQL!
    const wsInDb = await workspaceRepository.findById(pool, generatedWorkspaceId);
    expect(wsInDb).toBeNull();

    const tasksCount = await pool.query("SELECT COUNT(*)::int AS count FROM tasks");
    expect(tasksCount.rows[0].count).toBe(0);
  });
});
