import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: z.string().url().optional(),
  DATABASE_POOL_MIN: z.coerce.number().int().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(20),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(1000).default(5000),
  DATABASE_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),

  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters long"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  COOKIE_SECURE: z
    .string()
    .transform((val) => val === "true")
    .or(z.boolean())
    .default(false),
  CORS_ORIGIN: z.string().default("*"),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Environment validation error:");
    for (const issue of error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
  } else {
    console.error("❌ Unknown error loading environment variables:", error);
  }
  process.exit(1);
}

export const env = parsedEnv;

