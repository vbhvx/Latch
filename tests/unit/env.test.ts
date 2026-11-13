import { describe, it, expect } from "vitest";
import { parseEnv } from "../../src/config/env.js";

const base = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  SESSION_SECRET: "a-sufficiently-long-random-secret-value-1234567890",
};

const prod = {
  ...base,
  NODE_ENV: "production",
  COOKIE_SECURE: "true",
  CORS_ORIGIN: "https://app.example.com",
};

describe("Unit: environment validation", () => {
  it("applies safe defaults in development", () => {
    const env = parseEnv(base);
    expect(env.NODE_ENV).toBe("development");
    expect(env.TRUST_PROXY_HOPS).toBe(0);
    expect(env.COOKIE_SECURE).toBe(false);
  });

  it("accepts a correctly hardened production config", () => {
    expect(parseEnv(prod).NODE_ENV).toBe("production");
  });

  it("rejects insecure cookies in production", () => {
    expect(() => parseEnv({ ...prod, COOKIE_SECURE: "false" })).toThrow(/COOKIE_SECURE/);
  });

  it("rejects wildcard CORS in production", () => {
    expect(() => parseEnv({ ...prod, CORS_ORIGIN: "*" })).toThrow(/CORS_ORIGIN/);
  });

  it("rejects placeholder session secrets in production", () => {
    expect(() =>
      parseEnv({ ...prod, SESSION_SECRET: "dev-session-secret-must-be-at-least-32-chars-long" })
    ).toThrow(/SESSION_SECRET/);
  });

  it("rejects short session secrets everywhere", () => {
    expect(() => parseEnv({ ...base, SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
  });

  it("rejects an inverted pool size in production", () => {
    expect(() => parseEnv({ ...prod, DATABASE_POOL_MIN: "30", DATABASE_POOL_MAX: "5" })).toThrow(
      /DATABASE_POOL_MIN/
    );
  });
});
