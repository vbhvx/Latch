import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
} from "../../src/lib/crypto.js";

describe("Unit: Crypto Utilities", () => {
  it("should hash passwords with Argon2id and verify correctly", async () => {
    const password = "SuperSecretPassword123!";
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(password);

    const isMatch = await verifyPassword(hash, password);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword(hash, "WrongPassword!");
    expect(isWrongMatch).toBe(false);
  });

  it("should safely handle malformed password hashes without throwing", async () => {
    const isMatch = await verifyPassword("not-a-valid-argon-hash", "password");
    expect(isMatch).toBe(false);
  });

  it("should generate cryptographically secure 64-character hex session tokens", () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();

    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).toMatch(/^[0-9a-f]{64}$/);
    expect(token1).not.toBe(token2);
  });

  it("should hash session tokens deterministically with SHA-256", () => {
    const token = "a".repeat(64);
    const hash1 = hashSessionToken(token);
    const hash2 = hashSessionToken(token);

    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(token);
  });
});
