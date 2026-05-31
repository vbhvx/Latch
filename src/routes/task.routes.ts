import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskParamsSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type ListTasksQuery,
  type TaskParams,
  type UpdateTaskInput,
} from "../schemas/task.schema.js";
import { taskService } from "../services/task.service.js";

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  // All task routes require authentication
  app.addHook("preHandler", authenticate);

  // GET /api/v1/tasks - List tasks with filtering, pagination, and safe sorting
  app.get<{ Querystring: ListTasksQuery }>(
    "/tasks",
    {
      preHandler: [validate({ query: listTasksQuerySchema })],
    },
    async (request, reply) => {
      const result = await taskService.listTasks(request.user!, request.query);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/tasks - Create task
  app.post<{ Body: CreateTaskInput }>(
    "/tasks",
    {
      preHandler: [validate({ body: createTaskSchema })],
    },
    async (request, reply) => {
      const task = await taskService.createTask(request.user!, request.body);
      return reply.status(201).send({ task });
    }
  );

  // GET /api/v1/tasks/:taskId - Retrieve task detail
  app.get<{ Params: TaskParams }>(
    "/tasks/:taskId",
    {
      preHandler: [validate({ params: taskParamsSchema })],
    },
    async (request, reply) => {
      const task = await taskService.getTask(request.user!, request.params.taskId);
      return reply.status(200).send({ task });
    }
  );

  // PATCH /api/v1/tasks/:taskId - Update task with optimistic locking
  app.patch<{ Params: TaskParams; Body: UpdateTaskInput }>(
    "/tasks/:taskId",
    {
      preHandler: [validate({ params: taskParamsSchema, body: updateTaskSchema })],
    },
    async (request, reply) => {
      const task = await taskService.updateTask(
        request.user!,
        request.params.taskId,
        request.body
      );
      return reply.status(200).send({ task });
    }
  );

  // DELETE /api/v1/tasks/:taskId - Soft-delete task
  app.delete<{ Params: TaskParams }>(
    "/tasks/:taskId",
    {
      preHandler: [validate({ params: taskParamsSchema })],
    },
    async (request, reply) => {
      await taskService.deleteTask(request.user!, request.params.taskId);
      return reply.status(200).send({ message: "Task deleted successfully." });
    }
  );
}
