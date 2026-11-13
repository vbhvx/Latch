import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export interface PoolConfig {
  connectionString: string;
  min?: number;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statement_timeout?: number;
}

/**
 * Creates and configures a PostgreSQL connection pool.
 */
export function createPool(config?: Partial<PoolConfig>): pg.Pool {
  const connectionString =
    config?.connectionString ||
    (env.NODE_ENV === "test" && env.TEST_DATABASE_URL ? env.TEST_DATABASE_URL : env.DATABASE_URL);

  const pool = new Pool({
    connectionString,
    min: config?.min ?? env.DATABASE_POOL_MIN,
    max: config?.max ?? env.DATABASE_POOL_MAX,
    idleTimeoutMillis: config?.idleTimeoutMillis ?? env.DATABASE_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: config?.connectionTimeoutMillis ?? env.DATABASE_CONNECTION_TIMEOUT_MS,
    statement_timeout: config?.statement_timeout ?? env.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client", err);
  });

  return pool;
}

// Global application connection pool instance
export const pool = createPool();

/**
 * Gracefully close the database pool.
 */
export async function closePool(targetPool: pg.Pool = pool): Promise<void> {
  await targetPool.end();
}

/**
 * Database health check ping.
 */
export async function pingDatabase(targetPool: pg.Pool = pool): Promise<boolean> {
  try {
    const res = await targetPool.query("SELECT 1 AS alive");
    return res.rows[0]?.alive === 1;
  } catch {
    return false;
  }
}
