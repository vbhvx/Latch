import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { registry } from "../lib/metrics.js";

function tokensMatch(provided: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/metrics", { schema: { hide: true }, config: { rateLimit: false } }, async (request, reply) => {
    if (env.METRICS_TOKEN) {
      const header = request.headers.authorization ?? "";
      const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!tokensMatch(provided, env.METRICS_TOKEN)) {
        return reply.status(401).send({
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Invalid metrics token.",
            requestId: request.id,
          },
        });
      }
    }
    return reply.header("content-type", registry.contentType).send(await registry.metrics());
  });
}
