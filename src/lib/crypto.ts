import crypto from "node:crypto";
import argon2 from "argon2";

/**
 * Hash password using Argon2id with secure memory, iterations, and parallelism parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,       // 3 iterations
    parallelism: 1,
  });
}

/**
 * Verify password against Argon2id hash with timing safety.
 */
export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically secure random session token.
 * 32 bytes (256 bits of entropy) formatted as 64 hex characters.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash a session token using SHA-256 for secure storage in the database.
 * Only the hash is persisted in the database; raw tokens are never saved.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

