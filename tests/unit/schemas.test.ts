import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "../../src/schemas/auth.schema.js";
import { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from "../../src/schemas/task.schema.js";
import { createWorkspaceSchema, addMemberSchema } from "../../src/schemas/workspace.schema.js";

describe("Unit: Runtime Input Validation Schemas", () => {
  describe("Registration & Login Schemas", () => {
    it("should accept valid registration inputs", () => {
      const valid = {
        email: "test@example.com",
        displayName: "Tester",
        password: "StrongPassword123!",
      };
      expect(registerSchema.parse(valid)).toEqual(valid);
    });

    it("should reject invalid email, short password, or empty display name", () => {
      expect(() =>
        registerSchema.parse({
          email: "not-an-email",
          displayName: "Valid",
          password: "StrongPassword123!",
        })
      ).toThrow();

      expect(() =>
        registerSchema.parse({
          email: "test@example.com",
          displayName: "Valid",
          password: "short",
        })
      ).toThrow();

      expect(() =>
        registerSchema.parse({
          email: "test@example.com",
          displayName: "",
          password: "StrongPassword123!",
        })
      ).toThrow();
    });

    it("should strictly reject unrecognized unexpected fields (mass assignment prevention)", () => {
      expect(() =>
        registerSchema.parse({
          email: "test@example.com",
          displayName: "Valid",
          password: "StrongPassword123!",
          role: "admin", // malicious injection
          isAdmin: true,
        })
      ).toThrow();
    });

    it("should validate login input schema", () => {
      const valid = { email: "user@example.com", password: "Password123!" };
      expect(loginSchema.parse(valid)).toEqual(valid);

      expect(() => loginSchema.parse({ email: "invalid", password: "" })).toThrow();
    });
  });

  describe("Task Schemas", () => {
    it("should accept valid create task payload", () => {
      const valid = {
        workspaceId: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
        title: "Test Task",
        description: "Task description",
        status: "in_progress",
      };
      expect(createTaskSchema.parse(valid)).toEqual(valid);
    });

    it("should reject invalid UUIDs and empty titles", () => {
      expect(() =>
        createTaskSchema.parse({
          workspaceId: "invalid-uuid",
          title: "Valid Title",
        })
      ).toThrow();

      expect(() =>
        createTaskSchema.parse({
          workspaceId: "11111111-1111-1111-1111-111111111111",
          title: "",
        })
      ).toThrow();
    });

    it("should require expected version for updateTaskSchema (optimistic concurrency)", () => {
      expect(() =>
        updateTaskSchema.parse({
          title: "New Title",
          // missing version
        })
      ).toThrow();

      const validUpdate = {
        title: "New Title",
        version: 1,
      };
      expect(updateTaskSchema.parse(validUpdate)).toEqual(validUpdate);
    });

    it("should validate list tasks query parameters with defaults", () => {
      const parsed = listTasksQuerySchema.parse({
        sortBy: "title",
        limit: "50",
      });
      expect(parsed.sortBy).toBe("title");
      expect(parsed.limit).toBe(50);
      expect(parsed.sortOrder).toBe("desc"); // default
    });
  });

  describe("Workspace Schemas", () => {
    it("should validate workspace creation", () => {
      expect(createWorkspaceSchema.parse({ name: "Core Team" })).toEqual({ name: "Core Team" });
      expect(() => createWorkspaceSchema.parse({ name: "" })).toThrow();
    });

    it("should require either userId or email when adding a member", () => {
      expect(
        addMemberSchema.parse({
          email: "colleague@example.com",
          role: "member",
        })
      ).toEqual({
        email: "colleague@example.com",
        role: "member",
      });

      expect(() =>
        addMemberSchema.parse({
          role: "member",
        })
      ).toThrow();
    });
  });
});
