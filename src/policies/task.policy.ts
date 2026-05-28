import type { User } from "../repositories/user.repository.js";
import type { Task } from "../repositories/task.repository.js";
import type { WorkspaceRole } from "../repositories/workspace.repository.js";

export const taskPolicy = {
  /**
   * Only workspace owners and members can create tasks. Viewers cannot.
   */
  canCreateTask(_user: User, role: WorkspaceRole | null): boolean {
    return role === "owner" || role === "member";
  },

  /**
   * Any workspace member (owner, member, viewer) can read active tasks.
   */
  canReadTask(_user: User, role: WorkspaceRole | null, task: Task): boolean {
    if (!role) return false;
    return task.deleted_at === null;
  },

  /**
   * Workspace owners and members can update tasks. Viewers cannot.
   */
  canUpdateTask(_user: User, role: WorkspaceRole | null, task: Task): boolean {
    if (task.deleted_at !== null) return false;
    return role === "owner" || role === "member";
  },

  /**
   * Workspace owners can delete any task; members can delete tasks they own. Viewers cannot delete.
   */
  canDeleteTask(user: User, role: WorkspaceRole | null, task: Task): boolean {
    if (task.deleted_at !== null) return false;
    if (role === "owner") return true;
    if (role === "member") return task.owner_id === user.id;
    return false;
  },
};

