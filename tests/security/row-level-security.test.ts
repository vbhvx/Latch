import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { pool } from "../../src/db/pool.js";
import { withTransaction } from "../../src/db/transaction.js";
import { resetTestDatabase } from "../setup.js";
import { userRepository } from "../../src/repositories/user.repository.js";
import { workspaceRepository } from "../../src/repositories/workspace.repository.js";

describe("Security: PostgreSQL Row-Level Security (RLS) Defense-in-Depth", () => {
  // The test must not depend on out-of-band DB setup: provision the least-privilege role itself.
  beforeAll(async () => {
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'latch_app') THEN
          CREATE ROLE latch_app NOSUPERUSER NOBYPASSRLS NOLOGIN;
        END IF;
      END $$;
    `);
    await pool.query("GRANT USAGE ON SCHEMA public TO latch_app");
    await pool.query("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO latch_app");
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("should demonstrate that superusers/BYPASSRLS bypass RLS while application roles are strictly constrained", async () => {
    // 1. Create two users and a workspace
    const userA = await userRepository.createUser(pool, {
      email: "rls_a@example.com",
      display_name: "RLS User A",
      password_hash: "hash",
    });

    const userB = await userRepository.createUser(pool, {
      email: "rls_b@example.com",
      display_name: "RLS User B",
      password_hash: "hash",
    });

    const ws = await workspaceRepository.createWorkspace(pool, "RLS Workspace", userA.id);
    await workspaceRepository.createMembership(pool, ws.id, userA.id, "owner");
    // Notice: userB is NOT a member of ws!

    // 2. Insert a task in a transaction with userA context
    let taskId = "";
    await withTransaction(
      pool,
      async (client) => {
        const res = await client.query(
          `INSERT INTO tasks (workspace_id, owner_id, title)
           VALUES ($1, $2, 'RLS Protected Task')
           RETURNING id`,
          [ws.id, userA.id]
        );
        taskId = res.rows[0].id;
      },
      { userIdContext: userA.id }
    );

    // 3. Query under least-privilege role 'latch_app' (NOSUPERUSER, NOBYPASSRLS) with User A context
    const readUserA = await withTransaction(
      pool,
      async (client) => {
        await client.query("SET LOCAL ROLE latch_app");
        const res = await client.query("SELECT id, title FROM tasks WHERE id = $1", [taskId]);
        return res.rows;
      },
      { userIdContext: userA.id }
    );
    expect(readUserA).toHaveLength(1);
    expect(readUserA[0].title).toBe("RLS Protected Task");

    // 4. Query under least-privilege role 'latch_app' with User B (outsider) context:
    // PostgreSQL engine-level RLS policy filters out the row entirely!
    const readUserB = await withTransaction(
      pool,
      async (client) => {
        await client.query("SET LOCAL ROLE latch_app");
        const res = await client.query("SELECT id, title FROM tasks WHERE id = $1", [taskId]);
        return res.rows;
      },
      { userIdContext: userB.id }
    );
    expect(readUserB).toHaveLength(0); // 0 rows returned, row hidden by PostgreSQL RLS!
  });

  it("should prevent connection pool context pollution (SET LOCAL resets automatically after transaction)", async () => {
    const user = await userRepository.createUser(pool, {
      email: "pool_rls@example.com",
      display_name: "Pool User",
      password_hash: "hash",
    });

    // Run transaction with user context
    await withTransaction(
      pool,
      async (client) => {
        const res = await client.query("SELECT current_setting('app.current_user_id', true) AS ctx");
        expect(res.rows[0].ctx).toBe(user.id);
      },
      { userIdContext: user.id }
    );

    // Check out another connection from pool without setting context: must NOT leak previous user context!
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT current_setting('app.current_user_id', true) AS ctx");
      // Must be empty or undefined, NOT the previous user's ID
      expect(res.rows[0].ctx).not.toBe(user.id);
    } finally {
      client.release();
    }
  });
});
