import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { withTransaction } from "../db/transaction.js";
import { AuthenticationError, ConflictError, ForbiddenError } from "../errors/app-error.js";
import { generateSessionToken, hashPassword, hashSessionToken, verifyPassword } from "../lib/crypto.js";
import { auditRepository } from "../repositories/audit.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { userRepository, type User } from "../repositories/user.repository.js";
import { workspaceRepository } from "../repositories/workspace.repository.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";

// Dummy hash for constant-time comparison when email is not found
const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ1Njc4OTAxMg$9wXp3J5iK8+8JvUq9mYw4A";

export interface AuthResult {
  user: User;
  sessionToken: string;
  expiresAt: Date;
}

export const authService = {
  /**
   * Register a new user account, creating a personal workspace and session atomically.
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await userRepository.findByEmail(pool, input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists.", [
        { field: "email", code: "ALREADY_EXISTS", message: "Email is already registered" },
      ]);
    }

    const passwordHash = await hashPassword(input.password);
    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);

    return await withTransaction(pool, async (client) => {
      // 1. Create user
      const user = await userRepository.createUser(client, {
        email: input.email,
        display_name: input.displayName,
        password_hash: passwordHash,
      });

      // 2. Create default workspace
      const workspace = await workspaceRepository.createWorkspace(
        client,
        `${user.display_name}'s Workspace`,
        user.id
      );

      // 3. Assign user as Workspace Owner
      await workspaceRepository.createMembership(client, workspace.id, user.id, "owner");

      // 4. Create initial authenticated session
      await sessionRepository.createSession(client, user.id, tokenHash, expiresAt);

      // 5. Audit registration event
      await auditRepository.createAuditEvent(client, {
        actor_id: user.id,
        workspace_id: workspace.id,
        action: "user.registered",
        resource_type: "user",
        resource_id: user.id,
        metadata: { email: user.email },
      });

      return {
        user,
        sessionToken,
        expiresAt,
      };
    });
  },

  /**
   * Authenticate a user with email and password and return a new session token.
   * Protects against account enumeration via constant-time dummy verification.
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const userWithHash = await userRepository.findWithPasswordByEmail(pool, input.email);

    if (!userWithHash) {
      // Prevent timing attacks by executing a real Argon2 verification against dummy hash
      await verifyPassword(DUMMY_HASH, input.password);
      throw new AuthenticationError("Invalid email or password.");
    }

    const isValid = await verifyPassword(userWithHash.password_hash, input.password);
    if (!isValid) {
      throw new AuthenticationError("Invalid email or password.");
    }

    if (userWithHash.status !== "active") {
      throw new ForbiddenError("Your account has been deactivated or suspended.");
    }

    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);

    await withTransaction(pool, async (client) => {
      await sessionRepository.createSession(client, userWithHash.id, tokenHash, expiresAt);

      await auditRepository.createAuditEvent(client, {
        actor_id: userWithHash.id,
        action: "user.login",
        resource_type: "user",
        resource_id: userWithHash.id,
        metadata: { loginTime: new Date().toISOString() },
      });
    });

    const user: User = {
      id: userWithHash.id,
      email: userWithHash.email,
      display_name: userWithHash.display_name,
      status: userWithHash.status,
      created_at: userWithHash.created_at,
      updated_at: userWithHash.updated_at,
    };

    return {
      user,
      sessionToken,
      expiresAt,
    };
  },

  /**
   * Invalidate the current session token (Logout).
   */
  async logout(sessionToken: string): Promise<void> {
    const tokenHash = hashSessionToken(sessionToken);
    const validSession = await sessionRepository.findValidSessionByTokenHash(pool, tokenHash);
    if (validSession) {
      await sessionRepository.revokeSession(pool, validSession.session.id);
      await auditRepository.createAuditEvent(pool, {
        actor_id: validSession.user.id,
        action: "user.logout",
        resource_type: "session",
        resource_id: validSession.session.id,
      });
    }
  },

  /**
   * Get user profile by ID.
   */
  async getProfile(userId: string): Promise<User | null> {
    return userRepository.findById(pool, userId);
  },
};

