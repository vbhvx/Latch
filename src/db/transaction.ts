import type pg from "pg";

export type IsolationLevel = "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";

export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
  readOnly?: boolean;
  userIdContext?: string; // Optional user ID context for RLS (SET LOCAL app.current_user_id)
}

/**
 * Executes a callback within a managed PostgreSQL transaction.
 *
 * Guarantees:
 * 1. Checks out a dedicated client from the pool.
 * 2. Emits BEGIN (with optional isolation level and read-only mode).
 * 3. Applies transaction-scoped context if provided (SET LOCAL app.current_user_id = $1).
 * 4. Automatically commits on successful completion.
 * 5. Automatically rolls back if an exception occurs.
 * 6. Always releases the client back to the pool in a finally block.
 */
export async function withTransaction<T>(
  pool: pg.Pool,
  callback: (client: pg.PoolClient) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const client = await pool.connect();

  try {
    let beginQuery = "BEGIN";
    if (options.isolationLevel) {
      beginQuery += ` ISOLATION LEVEL ${options.isolationLevel}`;
    }
    if (options.readOnly) {
      beginQuery += " READ ONLY";
    }

    await client.query(beginQuery);

    if (options.userIdContext) {
      // SET LOCAL restricts the variable strictly to this transaction.
      // It automatically reverts upon COMMIT or ROLLBACK, preventing connection pool pollution.
      await client.query("SELECT set_config('app.current_user_id', $1, true)", [options.userIdContext]);
    }

    const result = await callback(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to rollback transaction:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}
