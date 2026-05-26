import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().trim().email("Invalid email address").max(255),
    displayName: z.string().trim().min(1, "Display name cannot be empty").max(100),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(128, "Password cannot exceed 128 characters"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: z.string().trim().email("Invalid email address").max(255),
    password: z.string().min(1, "Password is required").max(128),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

