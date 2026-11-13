# SQL Safety & Query Defense-in-Depth

## 1. Principles of SQL Safety

Direct SQL interaction with PostgreSQL offers performance, control, and architectural transparency. However, it requires disciplined security controls to prevent SQL injection, information disclosure, and database corruption.

Latch enforces five fundamental SQL safety rules:

1. **100% Parameterized Values:** Client-supplied values are never concatenated into SQL strings.
2. **Server-Controlled Sorting Allowlists:** Identifiers such as column names and sort orders cannot be parameterized; they are validated against strict compile-time allowlists.
3. **Explicit Column Projections:** Queries never use `SELECT *`; only required fields are projected, preventing credential leaks.
4. **Least-Privilege Database Roles:** Web applications run under dedicated roles without `SUPERUSER` or `BYPASSRLS`.
5. **PostgreSQL Row-Level Security (RLS):** Database engine policies act as a second layer of defense.

---

## 2. Parameterized SQL

All dynamic values are passed using PostgreSQL positional placeholders (`$1, $2, ...`):

```typescript
// SECURE: Values are sent out-of-band to PostgreSQL driver
const result = await client.query(
  `
    SELECT id, workspace_id, owner_id, title, status, version
    FROM tasks
    WHERE id = $1
      AND workspace_id = $2
      AND deleted_at IS NULL;
  `,
  [taskId, workspaceId]
);
```

### Why String Interpolation is Banned

```typescript
// INSECURE (NEVER ALLOWED): User-controlled input injected into SQL text
const sql = `SELECT * FROM tasks WHERE id = '${taskId}'`;
```

Even if inputs are validated by schemas, relying on validation alone to prevent SQL injection violates Defense-in-Depth. Parameterization ensures the PostgreSQL query parser treats input strictly as data, never as executable SQL tokens.

---

## 3. Dynamic Column Identifiers & Sorting

PostgreSQL parameters (`$1`) can only represent data values, not table names, column identifiers, or SQL keywords (`ASC`/`DESC`).

To allow user-requested sorting safely, Latch uses an allowlist resolver (`src/lib/sort.ts`):

```typescript
export const taskSortColumns = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  title: "title",
  status: "status",
} as const;

export function getSafeSortColumn<T extends Record<string, string>>(
  requestedField: string | undefined,
  allowlist: T,
  defaultField: keyof T
): string {
  if (!requestedField) {
    return allowlist[defaultField];
  }

  if (Object.prototype.hasOwnProperty.call(allowlist, requestedField)) {
    return allowlist[requestedField as keyof T];
  }

  throw new ValidationError(
    `Unsupported sort field: '${requestedField}'. Allowed fields: ${Object.keys(allowlist).join(", ")}`
  );
}
```

Any attempt to inject malicious SQL into sorting parameters (such as `?sortBy=title;DROP TABLE users;--`) is rejected with a `400 VALIDATION_ERROR` before any query reaches the database.

---

## 4. Prevention of Over-Fetching

General-purpose ORMs often perform `SELECT *`, fetching every column defined in a table. In security-sensitive tables, this risks accidentally returning password hashes or session secrets in JSON responses.

In Latch:

- User queries project `id, email, display_name, status, created_at, updated_at`.
- The `password_hash` column is queried exclusively by `userRepository.findWithPasswordByEmail`, a dedicated internal helper invoked only during password authentication in `authService.login`.
- Session queries never project or return `token_hash`.

---

## 5. PostgreSQL Row-Level Security (RLS) & Connection Pooling

### 5.1 RLS Implementation

Table `tasks` has Row-Level Security enabled and forced:

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;

CREATE POLICY task_select_policy ON tasks
  FOR SELECT
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR
    EXISTS (
      SELECT 1 FROM workspace_memberships wm
      WHERE wm.workspace_id = tasks.workspace_id
        AND wm.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
  );
```

### 5.2 Connection Pooling Safety (`SET LOCAL`)

When connection pooling is used (`pg.Pool`), session settings can leak across pooled connections if set via `SET app.current_user_id = ...`.

Latch mitigates this by applying `SET LOCAL` within managed transactions:

```typescript
await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
```

The third parameter `is_local = true` guarantees that the variable exists strictly for the duration of the current transaction (`BEGIN ... COMMIT/ROLLBACK`). When the client is released back to the pool, the setting automatically reverts to empty, preventing cross-tenant context contamination.

### 5.3 Non-Superuser Role Requirement

PostgreSQL superusers and roles with `BYPASSRLS` automatically bypass all RLS policies. In production, the API service must connect using a dedicated non-superuser role (e.g. `latch_app` with `NOSUPERUSER NOBYPASSRLS`) so that RLS is strictly enforced by the PostgreSQL database engine.
