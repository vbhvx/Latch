import { pool } from "../db/pool.js";
import { withTransaction } from "../db/transaction.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors/app-error.js";
import { workspacePolicy } from "../policies/workspace.policy.js";
import { auditRepository, type AuditEvent } from "../repositories/audit.repository.js";
import { userRepository, type User } from "../repositories/user.repository.js";
import {
  workspaceRepository,
  type Workspace,
  type WorkspaceMemberInfo,
  type WorkspaceRole,
  type UserWorkspaceSummary,
} from "../repositories/workspace.repository.js";
import type {
  AddMemberInput,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "../schemas/workspace.schema.js";

export const workspaceService = {
  /**
   * Create a new workspace and assign the creator as Owner atomically.
   */
  async createWorkspace(user: User, input: CreateWorkspaceInput): Promise<Workspace> {
    return await withTransaction(pool, async (client) => {
      const workspace = await workspaceRepository.createWorkspace(client, input.name, user.id);
      await workspaceRepository.createMembership(client, workspace.id, user.id, "owner");

      await auditRepository.createAuditEvent(client, {
        actor_id: user.id,
        workspace_id: workspace.id,
        action: "workspace.created",
        resource_type: "workspace",
        resource_id: workspace.id,
        metadata: { name: workspace.name },
      });

      return workspace;
    });
  },

  /**
   * List all workspaces accessible by the user.
   */
  async listWorkspaces(user: User): Promise<UserWorkspaceSummary[]> {
    return workspaceRepository.findWorkspacesForUser(pool, user.id);
  },

  /**
   * Get a single workspace if the user is a member.
   */
  async getWorkspace(
    user: User,
    workspaceId: string
  ): Promise<{ workspace: Workspace; role: WorkspaceRole }> {
    const membership = await workspaceRepository.findMembership(pool, workspaceId, user.id);
    if (!membership) {
      throw new NotFoundError("Workspace not found.");
    }

    const workspace = await workspaceRepository.findById(pool, workspaceId);
    if (!workspace) {
      throw new NotFoundError("Workspace not found.");
    }

    return { workspace, role: membership.role };
  },

  /**
   * Update a workspace's name (Owner only).
   */
  async updateWorkspace(user: User, workspaceId: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    const membership = await workspaceRepository.findMembership(pool, workspaceId, user.id);
    if (!membership) {
      throw new NotFoundError("Workspace not found.");
    }

    if (!workspacePolicy.canUpdateWorkspace(user, membership.role)) {
      throw new ForbiddenError("Only workspace owners can update workspace settings.");
    }

    return await withTransaction(pool, async (client) => {
      const updated = await workspaceRepository.updateWorkspace(client, workspaceId, input.name);
      if (!updated) {
        throw new NotFoundError("Workspace not found.");
      }

      await auditRepository.createAuditEvent(client, {
        actor_id: user.id,
        workspace_id: workspaceId,
        action: "workspace.updated",
        resource_type: "workspace",
        resource_id: workspaceId,
        metadata: { name: input.name },
      });

      return updated;
    });
  },

  /**
   * Delete a workspace (Owner only).
   */
  async deleteWorkspace(user: User, workspaceId: string): Promise<void> {
    const membership = await workspaceRepository.findMembership(pool, workspaceId, user.id);
    if (!membership) {
      throw new NotFoundError("Workspace not found.");
    }

    if (!workspacePolicy.canDeleteWorkspace(user, membership.role)) {
      throw new ForbiddenError("Only workspace owners can delete a workspace.");
    }

    await withTransaction(pool, async (client) => {
      await auditRepository.createAuditEvent(client, {
        actor_id: user.id,
        workspace_id: workspaceId,
        action: "workspace.deleted",
        resource_type: "workspace",
        resource_id: workspaceId,
      });

      const deleted = await workspaceRepository.deleteWorkspace(client, workspaceId);
      if (!deleted) {
        throw new NotFoundError("Workspace not found.");
      }
    });
  },

  /**
   * List members of a workspace.
   */
  async listMembers(user: User, workspaceId: string): Promise<WorkspaceMemberInfo[]> {
    const membership = await workspaceRepository.findMembership(pool, workspaceId, user.id);
    if (!membership) {
      throw new NotFoundError("Workspace not found.");
    }

    return workspaceRepository.listMembers(pool, workspaceId);
  },

  /**
   * Add a new member to a workspace (Owner only).
   */
  async addMember(user: User, workspaceId: string, input: AddMemberInput): Promise<WorkspaceMemberInfo> {
    const callerMembership = await workspaceRepository.findMembership(pool, workspaceId, user.id);
    if (!callerMembership) {
      throw new NotFoundError("Workspace not found.");
    }

    if (!workspacePolicy.canManageMembers(user, callerMembership.role)) {
      throw new ForbiddenError("Only workspace owners can add members.");
    }

    let targetUser: User | null = null;
    if (input.userId) {
      targetUser = await userRepository.findById(pool, input.userId);
    } else if (input.email) {
      targetUser = await userRepository.findByEmail(pool, input.email);
    }

    if (!targetUser) {
      throw new NotFoundError("User to be added was not found.");
    }

    const existingMembership = await workspaceRepository.findMembership(pool, workspaceId, targetUser.id);
    if (existingMembership) {
      throw new ConflictError("User is already a member of this workspace.", [
        { field: "userId", code: "ALREADY_MEMBER", message: "User is already a workspace member" },
      ]);
    }

    return await withTransaction(pool, async (client) => {
      const newMembership = await workspaceRepository.createMembership(
        client,
        workspaceId,
        targetUser!.id,
        input.role
      );

      await auditRepository.createAuditEvent(client, {
        actor_id: user.id,
        workspace_id: workspaceId,
        action: "member.added",
        resource_type: "workspace_membership",
        resource_id: newMembership.id,
        metadata: { targetUserId: targetUser!.id, role: input.role },
      });

      return {
        id: newMembership.id,
        workspace_id: newMembership.workspace_id,
        user_id: newMembership.user_id,
        role: newMembership.role,
        email: targetUser!.email,
        display_name: targetUser!.display_name,
        created_at: newMembership.created_at,
      };
    });
  },

  /**
   * Update a member's role (Owner only). Prevents demoting the last owner.
   */
  async updateMemberRole(
    user: User,
    workspaceId: string,
    targetUserId: string,
    newRole: WorkspaceRole
  ): Promise<WorkspaceMemberInfo> {
    const callerMembership = await workspaceRepository.findMembership(pool, workspaceId, user.id);
    if (!callerMembership) {
      throw new NotFoundError("Workspace not found.");
    }

    if (!workspacePolicy.canManageMembers(user, callerMembership.role)) {
      throw new ForbiddenError("Only workspace owners can modify member roles.");
    }

    const targetMembership = await workspaceRepository.findMembership(pool, workspaceId, targetUserId);
    if (!targetMembership) {
      throw new NotFoundError("Member not found in this workspace.");
    }

    if (targetMembership.role === "owner" && newRole !== "owner") {
      const ownerCount = await workspaceRepository.countOwners(pool, workspaceId);
      if (ownerCount <= 1) {
        throw new ConflictError("Cannot demote the only remaining owner of this workspace.");
      }
    }

    const targetUser = await userRepository.findById(pool, targetUserId);
    if (!targetUser) {
      throw new NotFoundError("Target user not found.");
    }

    return await withTransaction(pool, async (client) => {
      const updated = await workspaceRepository.updateMembershipRole(
        client,
        workspaceId,
        targetUserId,
        newRole
      );

      if (!updated) {
        throw new NotFoundError("Member not found.");
      }

      await auditRepository.createAuditEvent(client, {
        actor_id: user.id,
        workspace_id: workspaceId,
        action: "member.role_updated",
        resource_type: "workspace_membership",
        resource_id: updated.id,
        metadata: { targetUserId, previousRole: targetMembership.role, newRole },
      });

      return {
        id: updated.id,
        workspace_id: updated.workspace_id,
        user_id: updated.user_id,
        role: updated.role,
        email: targetUser.email,
        display_name: targetUser.display_name,
        created_at: updated.created_at,
      };
    });
  },

  /**
   * Remove a member from a workspace (Owner only). Prevents removing the last owner.
   */
  async removeMember(user: User, workspaceId: string, targetUserId: string): Promise<void> {
    const callerMembership = await workspaceRepository.findMembership(pool, workspaceId, user.id);
    if (!callerMembership) {
      throw new NotFoundError("Workspace not found.");
    }

    if (!workspacePolicy.canManageMembers(user, callerMembership.role)) {
      throw new ForbiddenError("Only workspace owners can remove members.");
    }

    const targetMembership = await workspaceRepository.findMembership(pool, workspaceId, targetUserId);
    if (!targetMembership) {
      throw new NotFoundError("Member not found in this workspace.");
    }

    if (targetMembership.role === "owner") {
      const ownerCount = await workspaceRepository.countOwners(pool, workspaceId);
      if (ownerCount <= 1) {
        throw new ConflictError("Cannot remove the only remaining owner of this workspace.");
      }
    }

    await withTransaction(pool, async (client) => {
      await workspaceRepository.deleteMembership(client, workspaceId, targetUserId);

      await auditRepository.createAuditEvent(client, {
        actor_id: user.id,
        workspace_id: workspaceId,
        action: "member.removed",
        resource_type: "workspace_membership",
        resource_id: targetUserId,
      });
    });
  },

  /**
   * List audit events for a workspace (Owner only).
   */
  async listAuditEvents(
    user: User,
    workspaceId: string,
    limit = 50,
    offset = 0
  ): Promise<{ events: AuditEvent[]; total: number }> {
    const membership = await workspaceRepository.findMembership(pool, workspaceId, user.id);
    if (!membership) {
      throw new NotFoundError("Workspace not found.");
    }

    if (!workspacePolicy.canViewAuditLogs(user, membership.role)) {
      throw new ForbiddenError("Only workspace owners can view audit logs.");
    }

    return auditRepository.listByWorkspace(pool, workspaceId, limit, offset);
  },
};
