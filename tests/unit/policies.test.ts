import { describe, it, expect } from "vitest";
import { workspacePolicy } from "../../src/policies/workspace.policy.js";
import { taskPolicy } from "../../src/policies/task.policy.js";
import type { User } from "../../src/repositories/user.repository.js";
import type { Task } from "../../src/repositories/task.repository.js";

describe("Unit: Centralized Authorization Policies", () => {
  const dummyUser: User = {
    id: "11111111-1111-1111-1111-111111111111",
    email: "user@example.com",
    display_name: "Test User",
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const otherUser: User = {
    id: "22222222-2222-2222-2222-222222222222",
    email: "other@example.com",
    display_name: "Other User",
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const activeTask: Task = {
    id: "33333333-3333-3333-3333-333333333333",
    workspace_id: "44444444-4444-4444-4444-444444444444",
    owner_id: dummyUser.id,
    title: "Write documentation",
    description: null,
    status: "todo",
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  const deletedTask: Task = {
    ...activeTask,
    deleted_at: new Date(),
  };

  describe("Workspace Policies", () => {
    it("should allow owners to view, update, delete, and manage members", () => {
      expect(workspacePolicy.canViewWorkspace(dummyUser, "owner")).toBe(true);
      expect(workspacePolicy.canUpdateWorkspace(dummyUser, "owner")).toBe(true);
      expect(workspacePolicy.canDeleteWorkspace(dummyUser, "owner")).toBe(true);
      expect(workspacePolicy.canManageMembers(dummyUser, "owner")).toBe(true);
      expect(workspacePolicy.canViewMembers(dummyUser, "owner")).toBe(true);
      expect(workspacePolicy.canViewAuditLogs(dummyUser, "owner")).toBe(true);
    });

    it("should restrict members from mutating workspace settings and managing members", () => {
      expect(workspacePolicy.canViewWorkspace(dummyUser, "member")).toBe(true);
      expect(workspacePolicy.canViewMembers(dummyUser, "member")).toBe(true);
      expect(workspacePolicy.canUpdateWorkspace(dummyUser, "member")).toBe(false);
      expect(workspacePolicy.canDeleteWorkspace(dummyUser, "member")).toBe(false);
      expect(workspacePolicy.canManageMembers(dummyUser, "member")).toBe(false);
      expect(workspacePolicy.canViewAuditLogs(dummyUser, "member")).toBe(false);
    });

    it("should restrict viewers to read-only actions", () => {
      expect(workspacePolicy.canViewWorkspace(dummyUser, "viewer")).toBe(true);
      expect(workspacePolicy.canViewMembers(dummyUser, "viewer")).toBe(true);
      expect(workspacePolicy.canUpdateWorkspace(dummyUser, "viewer")).toBe(false);
      expect(workspacePolicy.canDeleteWorkspace(dummyUser, "viewer")).toBe(false);
      expect(workspacePolicy.canManageMembers(dummyUser, "viewer")).toBe(false);
      expect(workspacePolicy.canViewAuditLogs(dummyUser, "viewer")).toBe(false);
    });

    it("should deny non-members from all actions", () => {
      expect(workspacePolicy.canViewWorkspace(dummyUser, null)).toBe(false);
      expect(workspacePolicy.canUpdateWorkspace(dummyUser, null)).toBe(false);
      expect(workspacePolicy.canDeleteWorkspace(dummyUser, null)).toBe(false);
      expect(workspacePolicy.canManageMembers(dummyUser, null)).toBe(false);
      expect(workspacePolicy.canViewMembers(dummyUser, null)).toBe(false);
      expect(workspacePolicy.canViewAuditLogs(dummyUser, null)).toBe(false);
    });
  });

  describe("Task Policies", () => {
    it("should allow owners and members to create tasks, but deny viewers", () => {
      expect(taskPolicy.canCreateTask(dummyUser, "owner")).toBe(true);
      expect(taskPolicy.canCreateTask(dummyUser, "member")).toBe(true);
      expect(taskPolicy.canCreateTask(dummyUser, "viewer")).toBe(false);
      expect(taskPolicy.canCreateTask(dummyUser, null)).toBe(false);
    });

    it("should allow owners, members, and viewers to read active tasks", () => {
      expect(taskPolicy.canReadTask(dummyUser, "owner", activeTask)).toBe(true);
      expect(taskPolicy.canReadTask(dummyUser, "member", activeTask)).toBe(true);
      expect(taskPolicy.canReadTask(dummyUser, "viewer", activeTask)).toBe(true);
      expect(taskPolicy.canReadTask(dummyUser, null, activeTask)).toBe(false);

      // Soft-deleted tasks cannot be read
      expect(taskPolicy.canReadTask(dummyUser, "owner", deletedTask)).toBe(false);
      expect(taskPolicy.canReadTask(dummyUser, "member", deletedTask)).toBe(false);
      expect(taskPolicy.canReadTask(dummyUser, "viewer", deletedTask)).toBe(false);
    });

    it("should allow owners and members to update tasks, but deny viewers", () => {
      expect(taskPolicy.canUpdateTask(dummyUser, "owner", activeTask)).toBe(true);
      expect(taskPolicy.canUpdateTask(dummyUser, "member", activeTask)).toBe(true);
      expect(taskPolicy.canUpdateTask(dummyUser, "viewer", activeTask)).toBe(false);
      expect(taskPolicy.canUpdateTask(dummyUser, null, activeTask)).toBe(false);

      // Cannot update deleted tasks
      expect(taskPolicy.canUpdateTask(dummyUser, "owner", deletedTask)).toBe(false);
    });

    it("should enforce task deletion rules", () => {
      // Workspace owner can delete any task
      expect(taskPolicy.canDeleteTask(otherUser, "owner", activeTask)).toBe(true);

      // Task creator (member) can delete their own task
      expect(taskPolicy.canDeleteTask(dummyUser, "member", activeTask)).toBe(true);

      // Other member cannot delete a task they do not own
      expect(taskPolicy.canDeleteTask(otherUser, "member", activeTask)).toBe(false);

      // Viewers cannot delete tasks
      expect(taskPolicy.canDeleteTask(dummyUser, "viewer", activeTask)).toBe(false);

      // Deleted tasks cannot be deleted again
      expect(taskPolicy.canDeleteTask(dummyUser, "owner", deletedTask)).toBe(false);
    });
  });
});

