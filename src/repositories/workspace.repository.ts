import type pg from "pg";

export type WorkspaceRole = "owner" | "member" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceMembership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceMemberInfo {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  email: string;
  display_name: string;
  created_at: Date;
}

export interface UserWorkspaceSummary {
  workspace: Workspace;
  role: WorkspaceRole;
}

type Queryable = pg.Pool | pg.PoolClient;

export const workspaceRepository = {
  /**
   * Create a new workspace.
   */
  async createWorkspace(db: Queryable, name: string, createdBy: string): Promise<Workspace> {
    const query = `
      INSERT INTO workspaces (name, created_by)
      VALUES ($1, $2)
      RETURNING id, name, created_by, created_at, updated_at;
    `;
    const res = await db.query(query, [name.trim(), createdBy]);
    return res.rows[0];
  },

  /**
   * Assign a membership role to a user within a workspace.
   */
  async createMembership(
    db: Queryable,
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<WorkspaceMembership> {
    const query = `
      INSERT INTO workspace_memberships (workspace_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING id, workspace_id, user_id, role, created_at, updated_at;
    `;
    const res = await db.query(query, [workspaceId, userId, role]);
    return res.rows[0];
  },

  /**
   * Find workspace by ID.
   */
  async findById(db: Queryable, workspaceId: string): Promise<Workspace | null> {
    const query = `
      SELECT id, name, created_by, created_at, updated_at
      FROM workspaces
      WHERE id = $1;
    `;
    const res = await db.query(query, [workspaceId]);
    return res.rows[0] || null;
  },

  /**
   * Check membership and role of a specific user in a workspace.
   */
  async findMembership(
    db: Queryable,
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMembership | null> {
    const query = `
      SELECT id, workspace_id, user_id, role, created_at, updated_at
      FROM workspace_memberships
      WHERE workspace_id = $1 AND user_id = $2;
    `;
    const res = await db.query(query, [workspaceId, userId]);
    return res.rows[0] || null;
  },

  /**
   * List all workspaces accessible by a user along with their role.
   */
  async findWorkspacesForUser(db: Queryable, userId: string): Promise<UserWorkspaceSummary[]> {
    const query = `
      SELECT
        w.id,
        w.name,
        w.created_by,
        w.created_at,
        w.updated_at,
        wm.role
      FROM workspaces w
      JOIN workspace_memberships wm ON w.id = wm.workspace_id
      WHERE wm.user_id = $1
      ORDER BY w.name ASC;
    `;
    const res = await db.query(query, [userId]);
    return res.rows.map((r) => ({
      workspace: {
        id: r.id,
        name: r.name,
        created_by: r.created_by,
        created_at: r.created_at,
        updated_at: r.updated_at,
      },
      role: r.role,
    }));
  },

  /**
   * List all members of a workspace with user profile details.
   */
  async listMembers(db: Queryable, workspaceId: string): Promise<WorkspaceMemberInfo[]> {
    const query = `
      SELECT
        wm.id,
        wm.workspace_id,
        wm.user_id,
        wm.role,
        wm.created_at,
        u.email,
        u.display_name
      FROM workspace_memberships wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = $1
      ORDER BY
        CASE wm.role
          WHEN 'owner' THEN 1
          WHEN 'member' THEN 2
          WHEN 'viewer' THEN 3
        END,
        u.display_name ASC;
    `;
    const res = await db.query(query, [workspaceId]);
    return res.rows;
  },

  /**
   * Update membership role.
   */
  async updateMembershipRole(
    db: Queryable,
    workspaceId: string,
    userId: string,
    newRole: WorkspaceRole
  ): Promise<WorkspaceMembership | null> {
    const query = `
      UPDATE workspace_memberships
      SET role = $1, updated_at = NOW()
      WHERE workspace_id = $2 AND user_id = $3
      RETURNING id, workspace_id, user_id, role, created_at, updated_at;
    `;
    const res = await db.query(query, [newRole, workspaceId, userId]);
    return res.rows[0] || null;
  },

  /**
   * Remove a member from a workspace.
   */
  async deleteMembership(db: Queryable, workspaceId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM workspace_memberships
      WHERE workspace_id = $1 AND user_id = $2
      RETURNING id;
    `;
    const res = await db.query(query, [workspaceId, userId]);
    return res.rows.length > 0;
  },

  /**
   * Count how many owners a workspace currently has (prevents leaving workspace ownerless).
   */
  async countOwners(db: Queryable, workspaceId: string): Promise<number> {
    const query = `
      SELECT COUNT(*)::int AS count
      FROM workspace_memberships
      WHERE workspace_id = $1 AND role = 'owner';
    `;
    const res = await db.query(query, [workspaceId]);
    return res.rows[0]?.count ?? 0;
  },

  /**
   * Update workspace details.
   */
  async updateWorkspace(db: Queryable, workspaceId: string, name: string): Promise<Workspace | null> {
    const query = `
      UPDATE workspaces
      SET name = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, created_by, created_at, updated_at;
    `;
    const res = await db.query(query, [name.trim(), workspaceId]);
    return res.rows[0] || null;
  },

  /**
   * Delete a workspace.
   */
  async deleteWorkspace(db: Queryable, workspaceId: string): Promise<boolean> {
    const query = `
      DELETE FROM workspaces
      WHERE id = $1
      RETURNING id;
    `;
    const res = await db.query(query, [workspaceId]);
    return res.rows.length > 0;
  },
};
