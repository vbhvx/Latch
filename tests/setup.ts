import { beforeAll, afterAll } from "vitest";
import { pool, closePool } from "../src/db/pool.js";
import { runMigrations } from "../db/migrate.js";

export async function resetTestDatabase() {
  const client = await pool.connect();
  try {
    // Set bypass_rls to allow truncation of RLS-protected tables
    await client.query("SELECT set_config('app.bypass_rls', 'on', true)");
    await client.query(
      "TRUNCATE audit_events, tasks, workspace_memberships, workspaces, sessions, users RESTART IDENTITY CASCADE"
    );
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  // Ensure test database schema is migrated
  await runMigrations(pool, "up");
  await resetTestDatabase();
});

afterAll(async () => {
  await closePool();
});
