import type pg from "pg";

export interface AuditEvent {
  id: string;
  actor_id: string | null;
  workspace_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface CreateAuditEventInput {
  actor_id: string | null;
  workspace_id?: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata?: Record<string, unknown>;
}

type Queryable = pg.Pool | pg.PoolClient;

export const auditRepository = {
  /**
   * Log an audit event transactionally.
   */
  async createAuditEvent(db: Queryable, input: CreateAuditEventInput): Promise<AuditEvent> {
    const query = `
      INSERT INTO audit_events (actor_id, workspace_id, action, resource_type, resource_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, actor_id, workspace_id, action, resource_type, resource_id, metadata, created_at;
    `;
    const res = await db.query(query, [
      input.actor_id,
      input.workspace_id ?? null,
      input.action,
      input.resource_type,
      input.resource_id,
      JSON.stringify(input.metadata ?? {}),
    ]);
    return res.rows[0];
  },

  /**
   * Retrieve audit history for a workspace.
   */
  async listByWorkspace(
    db: Queryable,
    workspaceId: string,
    limit = 50,
    offset = 0
  ): Promise<{ events: AuditEvent[]; total: number }> {
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM audit_events
      WHERE workspace_id = $1;
    `;
    const countRes = await db.query(countQuery, [workspaceId]);
    const total = countRes.rows[0]?.total ?? 0;

    const dataQuery = `
      SELECT id, actor_id, workspace_id, action, resource_type, resource_id, metadata, created_at
      FROM audit_events
      WHERE workspace_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const dataRes = await db.query(dataQuery, [workspaceId, limit, offset]);

    return {
      events: dataRes.rows,
      total,
    };
  },
};
