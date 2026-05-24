import crypto from "node:crypto";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { env } from "./config/env.js";
import { getLoggerConfig } from "./lib/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./routes/auth.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { taskRoutes } from "./routes/task.routes.js";
import { workspaceRoutes } from "./routes/workspace.routes.js";
import { uiRoutes } from "./routes/ui.routes.js";

export function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
  const app = fastify({
    logger: getLoggerConfig(),
    genReqId(req) {
      const incoming = req.headers["x-request-id"];
      if (typeof incoming === "string" && incoming.trim().length > 0) {
        return incoming.trim();
      }
      return `req_${crypto.randomUUID()}`;
    },
    ...opts,
  });

  // Centralized Error Handler
  app.setErrorHandler(errorHandler);

  // Custom Not Found Handler conforming to standard error envelope
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "Endpoint not found.",
        requestId: request.id,
      },
    });
  });

  // CORS
  app.register(fastifyCors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
    credentials: true,
  });

  // Cookies
  app.register(fastifyCookie, {
    secret: env.SESSION_SECRET,
  });

  // Rate Limiting
  app.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    allowList: ["127.0.0.1"],
  });

  // OpenAPI Swagger Documentation
  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Latch: Secure API and PostgreSQL Backend Foundation",
        description:
          "Production-grade, security-first API built directly on PostgreSQL with explicit boundaries, parameterized SQL, RBAC, and transactions.",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://${env.HOST === "0.0.0.0" ? "localhost" : env.HOST}:${env.PORT}`,
          description: "Current Server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "hex-token",
            description: "Opaque session token (or use HttpOnly 'latch_session' cookie)",
          },
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "latch_session",
            description: "Session cookie set upon login or registration",
          },
        },
      },
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    },
  });

  app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });

  // Register Routes
  app.register(uiRoutes);
  app.register(healthRoutes);
  app.register(authRoutes, { prefix: "/api/v1" });
  app.register(workspaceRoutes, { prefix: "/api/v1" });
  app.register(taskRoutes, { prefix: "/api/v1" });

  return app;
}
