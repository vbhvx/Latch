import type pg from "pg";
import { getSafeSortColumn, getSafeSortOrder, type SortOrder } from "../lib/sort.js";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  workspace_id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  version: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateTaskData {
  workspace_id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
}

export interface TaskFilterOptions {
  workspaceId?: string;
  workspaceIds?: string[]; // for multi-workspace access
  ownerId?: string;
  status?: TaskStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  limit?: number;
  offset?: number;
}

export const taskSortColumns = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  title: "title",
  status: "status",
} as const;

type Queryable = pg.Pool | pg.PoolClient;

export const taskRepository = {
  /**
   * Create a new task.
   */
  async createTask(db: Queryable, data: CreateTaskData): Promise<Task> {
    const query = `
      INSERT INTO tasks (workspace_id, owner_id, title, description, status, version)
      VALUES ($1, $2, $3, $4, $5, 1)
      RETURNING id, workspace_id, owner_id, title, description, status, version, created_at, updated_at, deleted_at;
    `;
    const res = await db.query(query, [
      data.workspace_id,
      data.owner_id,
      data.title.trim(),
      data.description ?? null,
      data.status ?? "todo",
    ]);
    return res.rows[0];
  },

  /**
   * Retrieve a task by ID (excluding soft-deleted tasks).
   */
  async findById(db: Queryable, taskId: string): Promise<Task | null> {
    const query = `
      SELECT id, workspace_id, owner_id, title, description, status, version, created_at, updated_at, deleted_at
      FROM tasks
      WHERE id = $1 AND deleted_at IS NULL;
    `;
    const res = await db.query(query, [taskId]);
    return res.rows[0] || null;
  },

  /**
   * List tasks matching parameterized filters.
   */
  async findTasks(db: Queryable, options: TaskFilterOptions): Promise<{ tasks: Task[]; total: number }> {
    const conditions: string[] = ["deleted_at IS NULL"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      params.push(options.workspaceId);
    } else if (options.workspaceIds && options.workspaceIds.length > 0) {
      conditions.push(`workspace_id = ANY($${paramIndex++})`);
      params.push(options.workspaceIds);
    }

    if (options.ownerId) {
      conditions.push(`owner_id = $${paramIndex++}`);
      params.push(options.ownerId);
    }

    if (options.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    if (options.search && options.search.trim().length > 0) {
      conditions.push(`title ILIKE $${paramIndex++}`);
      params.push(`%${options.search.trim()}%`);
    }

    const whereClause = conditions.join(" AND ");

    // Count query
    const countSql = `SELECT COUNT(*)::int AS total FROM tasks WHERE ${whereClause};`;
    const countRes = await db.query(countSql, params);
    const total = countRes.rows[0]?.total ?? 0;

    // Sorting safe resolution from predefined allowlist
    const sortColumn = getSafeSortColumn(options.sortBy, taskSortColumns, "createdAt");
    const sortOrder = getSafeSortOrder(options.sortOrder, "desc");

    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const offset = Math.max(options.offset ?? 0, 0);

    const queryParams = [...params, limit, offset];
    const dataSql = `
      SELECT id, workspace_id, owner_id, title, description, status, version, created_at, updated_at, deleted_at
      FROM tasks
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const dataRes = await db.query(dataSql, queryParams);
    return {
      tasks: dataRes.rows,
      total,
    };
  },

  /**
   * Update a task with Optimistic Concurrency Control.
   * Requires expectedVersion to match the current database version.
   * Increments version on success.
   */
  async updateWithVersion(
    db: Queryable,
    taskId: string,
    expectedVersion: number,
    data: UpdateTaskData
  ): Promise<{ task: Task | null; conflict: boolean }> {
    // 1. Build dynamic parameterized SET clause
    const setClauses: string[] = ["version = version + 1", "updated_at = NOW()"];
    const params: unknown[] = [];
    let pIdx = 1;

    if (data.title !== undefined) {
      setClauses.push(`title = $${pIdx++}`);
      params.push(data.title.trim());
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${pIdx++}`);
      params.push(data.description);
    }
    if (data.status !== undefined) {
      setClauses.push(`status = $${pIdx++}`);
      params.push(data.status);
    }

    const updateSql = `
      UPDATE tasks
      SET ${setClauses.join(", ")}
      WHERE id = $${pIdx++}
        AND version = $${pIdx}
        AND deleted_at IS NULL
      RETURNING id, workspace_id, owner_id, title, description, status, version, created_at, updated_at, deleted_at;
    `;

    params.push(taskId, expectedVersion);
    const res = await db.query(updateSql, params);

    if (res.rows.length > 0) {
      return { task: res.rows[0], conflict: false };
    }

    // If 0 rows updated, verify whether task exists to distinguish conflict vs not found
    const current = await this.findById(db, taskId);
    if (!current) {
      return { task: null, conflict: false };
    }

    // Task exists but version didn't match -> Conflict!
    return { task: current, conflict: true };
  },

  /**
   * Soft-delete a task.
   */
  async softDelete(db: Queryable, taskId: string): Promise<boolean> {
    const query = `
      UPDATE tasks
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id;
    `;
    const res = await db.query(query, [taskId]);
    return res.rows.length > 0;
  },
};
