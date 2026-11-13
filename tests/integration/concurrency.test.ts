import { describe, it, expect, beforeEach } from "vitest";
import { pool } from "../../src/db/pool.js";
import { resetTestDatabase } from "../setup.js";
import { userRepository } from "../../src/repositories/user.repository.js";
import { workspaceRepository } from "../../src/repositories/workspace.repository.js";
import { taskRepository } from "../../src/repositories/task.repository.js";

describe("Integration: Optimistic Concurrency Control (Version Checking)", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("should increment task version on successful update", async () => {
    const user = await userRepository.createUser(pool, {
      email: "concurrency@example.com",
      display_name: "Concurrency User",
      password_hash: "hash",
    });

    const ws = await workspaceRepository.createWorkspace(pool, "Concurrent WS", user.id);
    const task = await taskRepository.createTask(pool, {
      workspace_id: ws.id,
      owner_id: user.id,
      title: "Original Title",
      status: "todo",
    });

    expect(task.version).toBe(1);

    // Update with expectedVersion = 1
    const { task: updated, conflict } = await taskRepository.updateWithVersion(pool, task.id, 1, {
      title: "Updated Title",
    });

    expect(conflict).toBe(false);
    expect(updated?.version).toBe(2);
    expect(updated?.title).toBe("Updated Title");
  });

  it("should detect version conflicts and prevent lost updates under race conditions", async () => {
    const user = await userRepository.createUser(pool, {
      email: "racer@example.com",
      display_name: "Racer",
      password_hash: "hash",
    });

    const ws = await workspaceRepository.createWorkspace(pool, "Race WS", user.id);
    const task = await taskRepository.createTask(pool, {
      workspace_id: ws.id,
      owner_id: user.id,
      title: "Shared Document Task",
      status: "todo",
    });

    // Both Client A and Client B read the task at version 1
    const clientAVersion = task.version; // 1
    const clientBVersion = task.version; // 1

    // Client A performs update first
    const updateA = await taskRepository.updateWithVersion(pool, task.id, clientAVersion, {
      title: "Client A update",
    });
    expect(updateA.conflict).toBe(false);
    expect(updateA.task?.version).toBe(2);

    // Client B attempts update with stale version 1
    const updateB = await taskRepository.updateWithVersion(pool, task.id, clientBVersion, {
      title: "Client B conflicting update",
    });

    // Conflict detected!
    expect(updateB.conflict).toBe(true);
    // Persistent state was preserved by Client A and not overwritten by Client B
    const latest = await taskRepository.findById(pool, task.id);
    expect(latest?.title).toBe("Client A update");
    expect(latest?.version).toBe(2);
  });
});
