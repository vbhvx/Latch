import { pool } from "../db/pool.js";
import { withTransaction } from "../db/transaction.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors/app-error.js";
import { taskPolicy } from "../policies/task.policy.js";
import { auditRepository } from "../repositories/audit.repository.js";
import { taskRepository, type Task } from "../repositories/task.repository.js";
import type { User } from "../repositories/user.repository.js";
import { workspaceRepository } from "../repositories/workspace.repository.js";
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "../schemas/task.schema.js";

export const taskService = {
  /**
   * Create a new task within a workspace atomically with an audit log.
   */
  async createTask(user: User, input: CreateTaskInput): Promise<Task> {
    const membership = await workspaceRepository.findMembership(pool, input.workspaceId, user.id);
    if (!membership) {
      // Don't leak workspace existence to non-members
      throw new NotFoundError("Workspace not found.");
    }

    if (!taskPolicy.canCreateTask(user, membership.role)) {
      throw new ForbiddenError("Viewers are not permitted to create tasks.");
    }

    return await withTransaction(
      pool,
      async (client) => {
        const task = await taskRepository.createTask(client, {
          workspace_id: input.workspaceId,
          owner_id: user.id,
          title: input.title,
          description: input.description,
          status: input.status,
        });

        await auditRepository.createAuditEvent(client, {
          actor_id: user.id,
          workspace_id: input.workspaceId,
          action: "task.created",
          resource_type: "task",
          resource_id: task.id,
          metadata: { title: task.title, status: task.status },
        });

        return task;
      },
      { userIdContext: user.id }
    );
  },

  /**
   * List authorized tasks with filtering, pagination, and safe sorting.
   */
  async listTasks(
    user: User,
    query: ListTasksQuery
  ): Promise<{ tasks: Task[]; total: number; limit: number; offset: number }> {
    if (query.workspaceId) {
      const membership = await workspaceRepository.findMembership(pool, query.workspaceId, user.id);
      if (!membership) {
        throw new NotFoundError("Workspace not found.");
      }

      const { tasks, total } = await taskRepository.findTasks(pool, {
        workspaceId: query.workspaceId,
        status: query.status,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
        offset: query.offset,
      });

      return { tasks, total, limit: query.limit, offset: query.offset };
    }

    // If no workspace specified, fetch all workspaces the user has access to
    const userWorkspaces = await workspaceRepository.findWorkspacesForUser(pool, user.id);
    if (userWorkspaces.length === 0) {
      return { tasks: [], total: 0, limit: query.limit, offset: query.offset };
    }

    const permittedWorkspaceIds = userWorkspaces.map((w) => w.workspace.id);
    const { tasks, total } = await taskRepository.findTasks(pool, {
      workspaceIds: permittedWorkspaceIds,
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      limit: query.limit,
      offset: query.offset,
    });

    return { tasks, total, limit: query.limit, offset: query.offset };
  },

  /**
   * Retrieve a specific task if user is authorized.
   */
  async getTask(user: User, taskId: string): Promise<Task> {
    const task = await taskRepository.findById(pool, taskId);
    if (!task) {
      throw new NotFoundError("Task not found.");
    }

    const membership = await workspaceRepository.findMembership(pool, task.workspace_id, user.id);
    if (!membership) {
      // Return 404 to prevent resource existence disclosure
      throw new NotFoundError("Task not found.");
    }

    if (!taskPolicy.canReadTask(user, membership.role, task)) {
      throw new ForbiddenError("You are not permitted to view this task.");
    }

    return task;
  },

  /**
   * Update a task with Optimistic Concurrency Control (version checking).
   */
  async updateTask(user: User, taskId: string, input: UpdateTaskInput): Promise<Task> {
    const task = await taskRepository.findById(pool, taskId);
    if (!task) {
      throw new NotFoundError("Task not found.");
    }

    const membership = await workspaceRepository.findMembership(pool, task.workspace_id, user.id);
    if (!membership) {
      throw new NotFoundError("Task not found.");
    }

    if (!taskPolicy.canUpdateTask(user, membership.role, task)) {
      throw new ForbiddenError("Viewers are not permitted to update tasks.");
    }

    return await withTransaction(
      pool,
      async (client) => {
        const { task: updated, conflict } = await taskRepository.updateWithVersion(
          client,
          taskId,
          input.version,
          {
            title: input.title,
            description: input.description,
            status: input.status,
          }
        );

        if (conflict) {
          throw new ConflictError(
            "Task update conflict: The task was modified concurrently by another operation.",
            [
              {
                field: "version",
                code: "VERSION_CONFLICT",
                message: `Provided version ${input.version} does not match current task version ${updated?.version}`,
              },
            ]
          );
        }

        if (!updated) {
          throw new NotFoundError("Task not found.");
        }

        await auditRepository.createAuditEvent(client, {
          actor_id: user.id,
          workspace_id: task.workspace_id,
          action: "task.updated",
          resource_type: "task",
          resource_id: task.id,
          metadata: {
            previousVersion: input.version,
            newVersion: updated.version,
            changedFields: {
              ...(input.title !== undefined && { title: input.title }),
              ...(input.status !== undefined && { status: input.status }),
              ...(input.description !== undefined && { description: input.description }),
            },
          },
        });

        return updated;
      },
      { userIdContext: user.id }
    );
  },

  /**
   * Soft-delete a task.
   */
  async deleteTask(user: User, taskId: string): Promise<void> {
    const task = await taskRepository.findById(pool, taskId);
    if (!task) {
      throw new NotFoundError("Task not found.");
    }

    const membership = await workspaceRepository.findMembership(pool, task.workspace_id, user.id);
    if (!membership) {
      throw new NotFoundError("Task not found.");
    }

    if (!taskPolicy.canDeleteTask(user, membership.role, task)) {
      throw new ForbiddenError("You are not permitted to delete this task.");
    }

    await withTransaction(
      pool,
      async (client) => {
        const deleted = await taskRepository.softDelete(client, taskId);
        if (!deleted) {
          throw new NotFoundError("Task not found.");
        }

        await auditRepository.createAuditEvent(client, {
          actor_id: user.id,
          workspace_id: task.workspace_id,
          action: "task.deleted",
          resource_type: "task",
          resource_id: task.id,
        });
      },
      { userIdContext: user.id }
    );
  },
};
