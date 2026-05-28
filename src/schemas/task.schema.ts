import { z } from "zod";

export const taskParamsSchema = z
  .object({
    taskId: z.string().uuid("Invalid task ID format"),
  })
  .strict();

export type TaskParams = z.infer<typeof taskParamsSchema>;

export const createTaskSchema = z
  .object({
    workspaceId: z.string().uuid("Invalid workspace ID format"),
    title: z.string().trim().min(1, "Title cannot be empty").max(200),
    description: z.string().max(10000, "Description cannot exceed 10000 characters").nullable().optional(),
    status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  })
  .strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").max(200).optional(),
    description: z.string().max(10000, "Description cannot exceed 10000 characters").nullable().optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
    version: z.number().int().min(1, "Expected task version is required for optimistic concurrency control"),
  })
  .strict()
  .refine(
    (data) => data.title !== undefined || data.description !== undefined || data.status !== undefined,
    {
      message: "At least one field (title, description, or status) must be provided to update",
    }
  );

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const listTasksQuerySchema = z
  .object({
    workspaceId: z.string().uuid("Invalid workspace ID format").optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
    search: z.string().max(100).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "title", "status"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

