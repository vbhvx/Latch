import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { pingDatabase } from "../db/pool.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // Liveness probe: responds 200 if process is alive
  app.get("/health/liveness", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      status: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe: verifies PostgreSQL connection is active
  app.get("/health/readiness", async (_request: FastifyRequest, reply: FastifyReply) => {
    const isDbAlive = await pingDatabase();

    if (!isDbAlive) {
      return reply.status(503).send({
        status: "unhealthy",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      });
    }

    return reply.status(200).send({
      status: "ready",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  });
}
