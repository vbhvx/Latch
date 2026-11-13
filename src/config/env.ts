import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const booleanString = z
  .string()
  .transform((val) => val === "true")
  .or(z.boolean());

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
  SESSION_CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().min(0).default(60),
  COOKIE_SECURE: booleanString.default(false),
  CORS_ORIGIN: z.string().default("*"),

  // Number of reverse-proxy hops to trust for X-Forwarded-* (0 = trust none).
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(1_048_576),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

  ENABLE_DOCS: booleanString.default(true),
  ENABLE_METRICS: booleanString.default(true),
  // When set, GET /metrics requires `Authorization: Bearer <token>`.
  METRICS_TOKEN: z.string().min(16).optional(),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
});

export type Env = z.infer<typeof envSchema>;

const INSECURE_SECRET_MARKERS = ["dev-session-secret", "replace-with", "changeme"];

/**
 * Parses and cross-validates environment variables. In production, settings that
 * silently weaken security (insecure cookies, wildcard CORS, placeholder secrets)
 * are rejected at boot rather than discovered after an incident.
 */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = envSchema
    .superRefine((cfg, ctx) => {
      if (cfg.NODE_ENV !== "production") return;

      if (!cfg.COOKIE_SECURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["COOKIE_SECURE"],
          message: "COOKIE_SECURE must be true in production",
        });
      }
      if (cfg.CORS_ORIGIN === "*") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CORS_ORIGIN"],
          message:
            "CORS_ORIGIN must be an explicit origin in production (wildcard is not allowed with credentials)",
        });
      }
      const secret = cfg.SESSION_SECRET.toLowerCase();
      if (INSECURE_SECRET_MARKERS.some((marker) => secret.includes(marker))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SESSION_SECRET"],
          message: "SESSION_SECRET looks like a placeholder; generate one with `openssl rand -hex 32`",
        });
      }
      if (cfg.DATABASE_POOL_MIN > cfg.DATABASE_POOL_MAX) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["DATABASE_POOL_MIN"],
          message: "DATABASE_POOL_MIN cannot exceed DATABASE_POOL_MAX",
        });
      }
    })
    .parse(source);

  return parsed;
}

let parsedEnv: Env;

try {
  parsedEnv = parseEnv(process.env);
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
