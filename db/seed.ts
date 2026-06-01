import pg from "pg";
import { env } from "../src/config/env.js";
import { hashPassword } from "../src/lib/crypto.js";
import { withTransaction } from "../src/db/transaction.js";

export async function seed(targetPool: pg.Pool) {
  console.log("🌱 Seeding database...");

  await withTransaction(targetPool, async (client) => {
    // Set bypass_rls for administrative seeding
    await client.query("SELECT set_config('app.bypass_rls', 'on', true)");

    // Clean existing data
    await client.query("TRUNCATE audit_events, tasks, workspace_memberships, workspaces, sessions, users RESTART IDENTITY CASCADE");

    const defaultPasswordHash = await hashPassword("Password123!");

    // 1. Create Users
    const aliceRes = await client.query(
      `INSERT INTO users (email, display_name, password_hash, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id, email, display_name`,
      ["alice@example.com", "Alice Smith", defaultPasswordHash]
    );
    const alice = aliceRes.rows[0];

    const bobRes = await client.query(
      `INSERT INTO users (email, display_name, password_hash, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id, email, display_name`,
      ["bob@example.com", "Bob Jones", defaultPasswordHash]
    );
    const bob = bobRes.rows[0];

    const charlieRes = await client.query(
      `INSERT INTO users (email, display_name, password_hash, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id, email, display_name`,
      ["charlie@example.com", "Charlie Brown", defaultPasswordHash]
    );
    const charlie = charlieRes.rows[0];

    // 2. Create Shared Workspace: Engineering
    const engWsRes = await client.query(
      `INSERT INTO workspaces (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name`,
      ["Engineering Team", alice.id]
    );
    const engWs = engWsRes.rows[0];

    // Memberships for Engineering: Alice = Owner, Bob = Member, Charlie = Viewer
    await client.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role)
       VALUES ($1, $2, 'owner'), ($1, $3, 'member'), ($1, $4, 'viewer')`,
      [engWs.id, alice.id, bob.id, charlie.id]
    );

    // 3. Create Private Workspaces
    const alicePrivateRes = await client.query(
      `INSERT INTO workspaces (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name`,
      ["Alice Private Notes", alice.id]
    );
    const alicePrivateWs = alicePrivateRes.rows[0];

    await client.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [alicePrivateWs.id, alice.id]
    );

    const bobPrivateRes = await client.query(
      `INSERT INTO workspaces (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name`,
      ["Bob Private Tasks", bob.id]
    );
    const bobPrivateWs = bobPrivateRes.rows[0];

    await client.query(
      `INSERT INTO workspace_memberships (workspace_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [bobPrivateWs.id, bob.id]
    );

    // 4. Create Tasks in Engineering Team
    const task1 = await client.query(
      `INSERT INTO tasks (workspace_id, owner_id, title, description, status, version)
       VALUES ($1, $2, $3, $4, 'in_progress', 1)
       RETURNING id`,
      [engWs.id, alice.id, "Implement PostgreSQL connection pool", "Configure max connections, timeouts, and error listeners"]
    );

    const task2 = await client.query(
      `INSERT INTO tasks (workspace_id, owner_id, title, description, status, version)
       VALUES ($1, $2, $3, $4, 'todo', 1)
       RETURNING id`,
      [engWs.id, bob.id, "Write automated authorization test cases", "Cover positive and negative authorization matrix"]
    );

    // 5. Create Private Tasks
    const alicePrivateTask = await client.query(
      `INSERT INTO tasks (workspace_id, owner_id, title, description, status, version)
       VALUES ($1, $2, $3, $4, 'todo', 1)
       RETURNING id`,
      [alicePrivateWs.id, alice.id, "Alice confidential review", "Review quarterly compensation and performance"]
    );

    // 6. Record Audit Events
    await client.query(
      `INSERT INTO audit_events (actor_id, workspace_id, action, resource_type, resource_id, metadata)
       VALUES
       ($1, $2, 'workspace.created', 'workspace', $3, '{"name": "Engineering Team"}'::jsonb),
       ($1, $2, 'task.created', 'task', $4, '{"title": "Implement PostgreSQL connection pool"}'::jsonb),
       ($5, $2, 'task.created', 'task', $6, '{"title": "Write automated authorization test cases"}'::jsonb),
       ($1, $7, 'task.created', 'task', $8, '{"title": "Alice confidential review"}'::jsonb)`,
      [
        alice.id,
        engWs.id,
        String(engWs.id),
        String(task1.rows[0].id),
        bob.id,
        String(task2.rows[0].id),
        alicePrivateWs.id,
        String(alicePrivateTask.rows[0].id),
      ]
    );

    console.log("✅ Seed completed successfully.");
    console.log("   Users created:");
    console.log(`     - Alice (Owner):   alice@example.com / Password123!`);
    console.log(`     - Bob (Member):    bob@example.com / Password123!`);
    console.log(`     - Charlie (Viewer): charlie@example.com / Password123!`);
  });
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  const p = new pg.Pool({ connectionString: env.DATABASE_URL });
  seed(p)
    .then(async () => {
      await p.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Seed error:", err);
      await p.end();
      process.exit(1);
    });
}
