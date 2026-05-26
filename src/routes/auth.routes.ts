import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { authenticate, extractToken } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "../schemas/auth.schema.js";
import { authService } from "../services/auth.service.js";

function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date) {
  const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  reply.setCookie("latch_session", token, {
    path: "/",
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    maxAge: Math.max(maxAge, 0),
  });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/register
  app.post<{ Body: RegisterInput }>(
    "/auth/register",
    {
      config: {
        rateLimit: {
          max: env.AUTH_RATE_LIMIT_MAX,
          timeWindow: env.AUTH_RATE_LIMIT_WINDOW_MS,
        },
      },
      preHandler: [validate({ body: registerSchema })],
    },
    async (request, reply) => {
      const result = await authService.register(request.body);
      setSessionCookie(reply, result.sessionToken, result.expiresAt);
      return reply.status(201).send(result);
    }
  );

  // POST /api/v1/auth/login
  app.post<{ Body: LoginInput }>(
    "/auth/login",
    {
      config: {
        rateLimit: {
          max: env.AUTH_RATE_LIMIT_MAX,
          timeWindow: env.AUTH_RATE_LIMIT_WINDOW_MS,
        },
      },
      preHandler: [validate({ body: loginSchema })],
    },
    async (request, reply) => {
      const result = await authService.login(request.body);
      setSessionCookie(reply, result.sessionToken, result.expiresAt);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/auth/logout
  app.post(
    "/auth/logout",
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawToken = extractToken(request);
      if (rawToken) {
        await authService.logout(rawToken);
      }

      reply.clearCookie("latch_session", {
        path: "/",
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
      });

      return reply.status(200).send({ message: "Logged out successfully" });
    }
  );

  // GET /api/v1/me
  app.get(
    "/me",
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send({ user: request.user });
    }
  );
}
