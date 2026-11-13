import type { User } from "../repositories/user.repository.js";
import type { WorkspaceRole } from "../repositories/workspace.repository.js";

export const workspacePolicy = {
  canViewWorkspace(_user: User, role: WorkspaceRole | null): boolean {
    return role !== null;
  },

  canUpdateWorkspace(_user: User, role: WorkspaceRole | null): boolean {
    return role === "owner";
  },

  canDeleteWorkspace(_user: User, role: WorkspaceRole | null): boolean {
    return role === "owner";
  },

  canManageMembers(_user: User, role: WorkspaceRole | null): boolean {
    return role === "owner";
  },

  canViewMembers(_user: User, role: WorkspaceRole | null): boolean {
    return role !== null;
  },

  canViewAuditLogs(_user: User, role: WorkspaceRole | null): boolean {
    return role === "owner";
  },
};
