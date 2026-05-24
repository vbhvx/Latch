import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { closePool, pingDatabase } from "./db/pool.js";

async function start() {
  const app = buildApp();

  // Verify database connectivity prior to listening
  const dbConnected = await pingDatabase();
  if (!dbConnected) {
    app.log.error("Failed to connect to PostgreSQL database. Exiting.");
    process.exit(1);
  }

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Received shutdown signal. Gracefully closing application...");
    try {
      await app.close();
      await closePool();
      app.log.info("HTTP server and database pool closed cleanly.");
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Error during graceful shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`\n🚀 Latch Secure API Server running at http://${env.HOST}:${env.PORT}`);
    console.log(`📚 Interactive OpenAPI Swagger UI: http://${env.HOST}:${env.PORT}/docs`);
    console.log(`🩺 Health status: http://${env.HOST}:${env.PORT}/health/readiness\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

