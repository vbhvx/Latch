import type { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticationError } from "../errors/app-error.js";
import { hashSessionToken } from "../lib/crypto.js";
import { sessionRepository, type Session } from "../repositories/session.repository.js";
import type { User } from "../repositories/user.repository.js";
import { pool } from "../db/pool.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
    session?: Session;
  }
}

/**
 * Extracts session token from either Authorization header (Bearer <token>)
 * or HttpOnly cookie (latch_session).
 */
export function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.substring(7).trim();
    if (bearerToken.length > 0) {
      return bearerToken;
    }
  }

  const cookieToken = request.cookies?.latch_session;
  if (cookieToken && cookieToken.trim().length > 0) {
    return cookieToken.trim();
  }

  return null;
}

/**
 * Authentication middleware: ensures the incoming request is tied to an active, valid session.
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const rawToken = extractToken(request);
  if (!rawToken) {
    throw new AuthenticationError("Authentication required. Please provide a valid session token.");
  }

  const tokenHash = hashSessionToken(rawToken);
  const sessionUser = await sessionRepository.findValidSessionByTokenHash(pool, tokenHash);

  if (!sessionUser) {
    throw new AuthenticationError("Invalid or expired session. Please authenticate again.");
  }

  // Update session activity asynchronously without blocking the response
  sessionRepository.touchSession(pool, sessionUser.session.id).catch((err) => {
    request.log.warn({ err, sessionId: sessionUser.session.id }, "Failed to touch session last_seen_at");
  });

  request.user = sessionUser.user;
  request.session = sessionUser.session;
}
