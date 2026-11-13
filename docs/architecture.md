# System Architecture

## 1. Architectural Philosophy

**Latch** is an open, security-first backend foundation built directly on **Node.js, TypeScript, Fastify, and PostgreSQL**.

The design follows a strict layered architecture where security boundaries, validation, access control, and transactional persistence are decoupled into discrete, independently testable layers:

```text
Client / API Consumer (Browser, Mobile, CLI)
                      │
                      ▼
             HTTP Server (Fastify)
                      │
                      ▼
     Request Parsing & Runtime Validation (Zod)
                      │
                      ▼
       Authentication & Session Extraction (Argon2id + SHA-256 Sessions)
                      │
                      ▼
       Centralized Authorization Policies (RBAC & Ownership Policies)
                      │
                      ▼
       Application Business Services (Transaction Boundaries & Auditing)
                      │
                      ▼
       Data-Access Layer (Parameterized SQL Repositories)
                      │
                      ▼
           PostgreSQL 16 Database
  (Constraints, Indexes, Transactions, Row-Level Security)
```

---

## 2. Layer Responsibilities & Contracts

### 2.1 HTTP Server (`src/app.ts`, `src/server.ts`)

- Configured with Fastify 5 for high-throughput, low-latency request handling.
- Manages request lifecycle, correlation IDs (`x-request-id`), CORS policy, structured logging (Pino), and rate limiting.
- Maps internal errors to sanitized, RFC-compliant error payloads through `src/middleware/error-handler.ts`.

### 2.2 Request Parsing & Validation Layer (`src/middleware/validate.ts`, `src/schemas/`)

- All untrusted inputs (headers, path parameters, query strings, request bodies) are validated at the API boundary using **Zod**.
- Write endpoint schemas enforce `.strict()` to reject unexpected fields, eliminating mass-assignment vulnerabilities.
- Rejection occurs before business logic execution.

### 2.3 Authentication Layer (`src/middleware/authenticate.ts`, `src/services/auth.service.ts`)

- Verifies identity ("Who is making this request?").
- Dual-mode session extraction:
  1. `Authorization: Bearer <session_token>` header (for programmatic clients).
  2. `latch_session` cookie (for browser clients with `HttpOnly`, `SameSite=Lax`, and `Secure` attributes).
- Cryptographically secure 256-bit random tokens are hashed using SHA-256 prior to lookup in the `sessions` table. Raw tokens are never persisted in the database.
- Implements constant-time dummy password hashing on non-existent accounts to eliminate timing-based account enumeration.

### 2.4 Authorization Policies (`src/policies/`)

- Verifies permissions ("Is that identity permitted to perform this operation on this resource in its current state?").
- Fully centralized in `workspace.policy.ts` and `task.policy.ts`.
- Evaluates:
  - Caller identity (`User`).
  - Workspace role (`owner`, `member`, `viewer`).
  - Resource state (e.g. active vs soft-deleted).
  - Explicit ownership relationships (e.g. task creator).
- Non-members attempting access to private resources receive `404 Not Found` rather than `403 Forbidden` to prevent resource existence enumeration.

### 2.5 Business Services Layer (`src/services/`)

- Coordinates business workflows, state transitions, and audit records.
- Manages PostgreSQL transaction boundaries via `withTransaction`.
- Enforces Optimistic Concurrency Control (OCC) during task mutations using incremental version checking.

### 2.6 Data Access Layer (`src/repositories/`)

- All database interactions use direct, explicit SQL queries through `pg.Pool` or `pg.PoolClient`.
- Values are strictly passed via parameterized placeholders (`$1, $2, ...`).
- Dynamic column sorting uses a strict server-controlled allowlist (`src/lib/sort.ts`).
- Avoids `SELECT *`; explicitly selects required columns to prevent accidental leakage of sensitive attributes (e.g. password hashes).

### 2.7 PostgreSQL Database Layer

- Enforces persistent data invariants regardless of API entry point:
  - Primary keys (`UUID` via `gen_random_uuid()`).
  - Foreign key constraints (`ON DELETE CASCADE` or `RESTRICT`).
  - Check constraints for status enums and non-empty strings.
  - Unique indexes (e.g. case-insensitive email uniqueness, `(workspace_id, user_id)` unique membership).
  - Row-Level Security (RLS) on `tasks` enforcing workspace-level data visibility at the database engine level.

---

## 3. Trust Boundaries

| Boundary          | Untrusted Input                              | Enforcement Mechanism                             |
| ----------------- | -------------------------------------------- | ------------------------------------------------- |
| Network Boundary  | HTTP headers, cookies, URL params, JSON body | Zod schemas, Fastify rate limit, Pino redaction   |
| Identity Boundary | Session tokens, email/password               | Argon2id verification, SHA-256 session hash       |
| Access Boundary   | Resource IDs, workspace IDs                  | Centralized policies, resource-scoped SQL queries |
| Storage Boundary  | SQL query construction                       | Parameterized statements, column allowlists, RLS  |

---

## 4. Transaction Strategy

Database transactions are strictly scoped to operations requiring atomic multi-step execution:

1. **User Registration:** Creates `user` record + default personal `workspace` + `workspace_membership` (Owner) + initial `session` + `audit_event` in a single atomic transaction.
2. **Task Creation / Mutation:** Task write and mandatory `audit_event` write occur within the same transaction. If audit creation fails, the task mutation is rolled back completely.
3. **Optimistic Locking:** Task updates include `version = $expectedVersion` in the `WHERE` clause, incrementing version to `version + 1`. A mismatch triggers a `409 Conflict`.
