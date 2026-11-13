import type { FastifyBaseLogger } from "fastify";
import { pool } from "../db/pool.js";
import { sessionsPurged } from "../lib/metrics.js";
import { sessionRepository } from "../repositories/session.repository.js";

/**
 * Periodically deletes expired sessions so the table (and its token_hash index)
 * does not grow without bound. Returns a stop function for graceful shutdown.
 */
export function startSessionCleanup(intervalMinutes: number, log: FastifyBaseLogger): () => void {
  if (intervalMinutes <= 0) return () => {};

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const deleted = await sessionRepository.deleteExpiredSessions(pool);
      if (deleted > 0) {
        sessionsPurged.inc(deleted);
        log.info({ deleted }, "Purged expired sessions");
      }
    } catch (err) {
      log.error({ err }, "Session cleanup failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(run, intervalMinutes * 60_000);
  timer.unref();
  void run();
  return () => clearInterval(timer);
}
