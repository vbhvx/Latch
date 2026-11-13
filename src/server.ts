import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { closePool, pingDatabase } from "./db/pool.js";
import { startSessionCleanup } from "./jobs/session-cleanup.js";

async function start() {
  const app = buildApp();

  // Verify database connectivity prior to listening
  const dbConnected = await pingDatabase();
  if (!dbConnected) {
    app.log.error("Failed to connect to PostgreSQL database. Exiting.");
    process.exit(1);
  }

  const stopSessionCleanup = startSessionCleanup(env.SESSION_CLEANUP_INTERVAL_MINUTES, app.log);

  // Graceful shutdown handling: stop accepting work, drain in-flight requests, release the pool.
  // A hard timeout guarantees the process exits even if a connection refuses to drain.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, "Received shutdown signal. Gracefully closing application...");
    setTimeout(() => {
      app.log.error("Graceful shutdown timed out. Forcing exit.");
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS).unref();
    try {
      stopSessionCleanup();
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
  process.on("unhandledRejection", (reason) => {
    app.log.fatal({ err: reason }, "Unhandled promise rejection");
    void shutdown("unhandledRejection");
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(
      { docs: env.ENABLE_DOCS ? "/docs" : null, readiness: "/health/readiness" },
      "Latch API ready"
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
