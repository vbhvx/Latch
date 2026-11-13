import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import {
  addMemberSchema,
  createWorkspaceSchema,
  memberParamsSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
  workspaceParamsSchema,
  type AddMemberInput,
  type CreateWorkspaceInput,
  type MemberParams,
  type UpdateMemberRoleInput,
  type UpdateWorkspaceInput,
  type WorkspaceParams,
} from "../schemas/workspace.schema.js";
import { workspaceService } from "../services/workspace.service.js";

export async function workspaceRoutes(app: FastifyInstance): Promise<void> {
  // All workspace routes require authentication
  app.addHook("preHandler", authenticate);

  // GET /api/v1/workspaces - List workspaces
  app.get("/workspaces", async (request, reply) => {
    const workspaces = await workspaceService.listWorkspaces(request.user!);
    return reply.status(200).send({ workspaces });
  });

  // POST /api/v1/workspaces - Create workspace
  app.post<{ Body: CreateWorkspaceInput }>(
    "/workspaces",
    {
      preHandler: [validate({ body: createWorkspaceSchema })],
    },
    async (request, reply) => {
      const workspace = await workspaceService.createWorkspace(request.user!, request.body);
      return reply.status(201).send({ workspace });
    }
  );

  // GET /api/v1/workspaces/:workspaceId - Get workspace detail
  app.get<{ Params: WorkspaceParams }>(
    "/workspaces/:workspaceId",
    {
      preHandler: [validate({ params: workspaceParamsSchema })],
    },
    async (request, reply) => {
      const result = await workspaceService.getWorkspace(request.user!, request.params.workspaceId);
      return reply.status(200).send(result);
    }
  );

  // PATCH /api/v1/workspaces/:workspaceId - Update workspace
  app.patch<{ Params: WorkspaceParams; Body: UpdateWorkspaceInput }>(
    "/workspaces/:workspaceId",
    {
      preHandler: [validate({ params: workspaceParamsSchema, body: updateWorkspaceSchema })],
    },
    async (request, reply) => {
      const workspace = await workspaceService.updateWorkspace(
        request.user!,
        request.params.workspaceId,
        request.body
      );
      return reply.status(200).send({ workspace });
    }
  );

  // DELETE /api/v1/workspaces/:workspaceId - Delete workspace
  app.delete<{ Params: WorkspaceParams }>(
    "/workspaces/:workspaceId",
    {
      preHandler: [validate({ params: workspaceParamsSchema })],
    },
    async (request, reply) => {
      await workspaceService.deleteWorkspace(request.user!, request.params.workspaceId);
      return reply.status(200).send({ message: "Workspace deleted successfully." });
    }
  );

  // GET /api/v1/workspaces/:workspaceId/members - List members
  app.get<{ Params: WorkspaceParams }>(
    "/workspaces/:workspaceId/members",
    {
      preHandler: [validate({ params: workspaceParamsSchema })],
    },
    async (request, reply) => {
      const members = await workspaceService.listMembers(request.user!, request.params.workspaceId);
      return reply.status(200).send({ members });
    }
  );

  // POST /api/v1/workspaces/:workspaceId/members - Add member
  app.post<{ Params: WorkspaceParams; Body: AddMemberInput }>(
    "/workspaces/:workspaceId/members",
    {
      preHandler: [validate({ params: workspaceParamsSchema, body: addMemberSchema })],
    },
    async (request, reply) => {
      const member = await workspaceService.addMember(
        request.user!,
        request.params.workspaceId,
        request.body
      );
      return reply.status(201).send({ member });
    }
  );

  // PATCH /api/v1/workspaces/:workspaceId/members/:userId - Update member role
  app.patch<{ Params: MemberParams; Body: UpdateMemberRoleInput }>(
    "/workspaces/:workspaceId/members/:userId",
    {
      preHandler: [validate({ params: memberParamsSchema, body: updateMemberRoleSchema })],
    },
    async (request, reply) => {
      const member = await workspaceService.updateMemberRole(
        request.user!,
        request.params.workspaceId,
        request.params.userId,
        request.body.role
      );
      return reply.status(200).send({ member });
    }
  );

  // DELETE /api/v1/workspaces/:workspaceId/members/:userId - Remove member
  app.delete<{ Params: MemberParams }>(
    "/workspaces/:workspaceId/members/:userId",
    {
      preHandler: [validate({ params: memberParamsSchema })],
    },
    async (request, reply) => {
      await workspaceService.removeMember(request.user!, request.params.workspaceId, request.params.userId);
      return reply.status(200).send({ message: "Member removed successfully." });
    }
  );

  // GET /api/v1/workspaces/:workspaceId/audit-events - View audit logs (Owner only)
  app.get<{ Params: WorkspaceParams }>(
    "/workspaces/:workspaceId/audit-events",
    {
      preHandler: [validate({ params: workspaceParamsSchema })],
    },
    async (request, reply) => {
      const result = await workspaceService.listAuditEvents(request.user!, request.params.workspaceId);
      return reply.status(200).send(result);
    }
  );
}
