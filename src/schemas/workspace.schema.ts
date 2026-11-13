import { z } from "zod";

export const workspaceParamsSchema = z
  .object({
    workspaceId: z.string().uuid("Invalid workspace ID format"),
  })
  .strict();

export type WorkspaceParams = z.infer<typeof workspaceParamsSchema>;

export const createWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1, "Workspace name cannot be empty").max(100),
  })
  .strict();

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1, "Workspace name cannot be empty").max(100),
  })
  .strict();

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const addMemberSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID format").optional(),
    email: z.string().trim().email("Invalid email format").optional(),
    role: z.enum(["owner", "member", "viewer"]),
  })
  .strict()
  .refine((data) => data.userId || data.email, {
    message: "Either userId or email must be provided to add a member",
    path: ["userId"],
  });

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z
  .object({
    role: z.enum(["owner", "member", "viewer"]),
  })
  .strict();

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const memberParamsSchema = z
  .object({
    workspaceId: z.string().uuid("Invalid workspace ID format"),
    userId: z.string().uuid("Invalid user ID format"),
  })
  .strict();

export type MemberParams = z.infer<typeof memberParamsSchema>;
