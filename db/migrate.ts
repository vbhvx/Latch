import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { env } from "../src/config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

interface MigrationFile {
  name: string;
  upSql: string;
  downSql: string;
}

function loadMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  return files.map((file) => {
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    const upIndex = content.indexOf("-- Up");
    const downIndex = content.indexOf("-- Down");

    let upSql = "";
    let downSql = "";

    if (upIndex !== -1 && downIndex !== -1 && downIndex > upIndex) {
      upSql = content.substring(upIndex + 5, downIndex).trim();
      downSql = content.substring(downIndex + 7).trim();
    } else if (upIndex !== -1 && downIndex === -1) {
      upSql = content.substring(upIndex + 5).trim();
    } else {
      upSql = content.trim();
    }

    return {
      name: file,
      upSql,
      downSql,
    };
  });
}

export async function runMigrations(
  targetPool: pg.Pool,
  action: "up" | "down" | "status" = "up"
): Promise<{ applied: string[]; reverted?: string }> {
  const client = await targetPool.connect();

  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const res = await client.query("SELECT version, applied_at FROM schema_migrations ORDER BY version ASC");
    const appliedVersions = new Set<string>(res.rows.map((r) => r.version));

    const migrationFiles = loadMigrationFiles();

    if (action === "status") {
      console.log("\n📋 Database Migrations Status:");
      console.log("--------------------------------------------------------------------------------");
      for (const m of migrationFiles) {
        const isApplied = appliedVersions.has(m.name);
        const row = res.rows.find((r) => r.version === m.name);
        const dateStr = row ? new Date(row.applied_at).toISOString() : "Not applied";
        console.log(`[${isApplied ? "✔ APPLIED" : "  PENDING"}] ${m.name.padEnd(35)} (Applied: ${dateStr})`);
      }
      console.log("--------------------------------------------------------------------------------\n");
      return { applied: Array.from(appliedVersions) };
    }

    if (action === "up") {
      const pending = migrationFiles.filter((m) => !appliedVersions.has(m.name));
      const newlyApplied: string[] = [];

      for (const m of pending) {
        console.log(`⏳ Applying migration: ${m.name}...`);
        await client.query("BEGIN");
        try {
          // Allow DDL and initial setup to run with bypass_rls = on
          await client.query("SELECT set_config('app.bypass_rls', 'on', true)");
          if (m.upSql.length > 0) {
            await client.query(m.upSql);
          }
          await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [m.name]);
          await client.query("COMMIT");
          console.log(`✅ Applied migration: ${m.name}`);
          newlyApplied.push(m.name);
        } catch (err) {
          await client.query("ROLLBACK");
          console.error(`❌ Migration failed: ${m.name}`, err);
          throw err;
        }
      }

      if (newlyApplied.length === 0) {
        console.log("Database schema is already up to date.");
      }
      return { applied: newlyApplied };
    }

    if (action === "down") {
      const appliedList = migrationFiles.filter((m) => appliedVersions.has(m.name));
      if (appliedList.length === 0) {
        console.log("No migrations to rollback.");
        return { applied: [] };
      }

      const lastMigration = appliedList[appliedList.length - 1]!;
      console.log(`⏳ Rolling back migration: ${lastMigration.name}...`);
      await client.query("BEGIN");
      try {
        await client.query("SELECT set_config('app.bypass_rls', 'on', true)");
        if (lastMigration.downSql.length > 0) {
          await client.query(lastMigration.downSql);
        }
        await client.query("DELETE FROM schema_migrations WHERE version = $1", [lastMigration.name]);
        await client.query("COMMIT");
        console.log(`✅ Rolled back migration: ${lastMigration.name}`);
        return { applied: [], reverted: lastMigration.name };
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`❌ Migration rollback failed: ${lastMigration.name}`, err);
        throw err;
      }
    }

    return { applied: [] };
  } finally {
    client.release();
  }
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  const actionArg = process.argv[2] as "up" | "down" | "status" | undefined;
  const action = actionArg === "down" ? "down" : actionArg === "status" ? "status" : "up";
  const isTestDb = process.argv.includes("--test");

  const connStr = isTestDb ? env.TEST_DATABASE_URL || env.DATABASE_URL : env.DATABASE_URL;
  const p = new pg.Pool({ connectionString: connStr });

  runMigrations(p, action)
    .then(async () => {
      await p.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Migration error:", err);
      await p.end();
      process.exit(1);
    });
}

