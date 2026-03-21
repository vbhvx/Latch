# Technical Specification: Secure API and PostgreSQL Backend Foundation

**Project Type:** Security-First Backend Engineering Platform  
**Primary Focus:** Authentication, Authorization, Input Validation, REST API Design, PostgreSQL, Parameterized SQL, Database Integrity, Transactions, and Automated Security Testing  
**Target Users:** Full-stack developers, backend engineers, SaaS developers, and small application teams  
**Engineering Objective:** Build a reusable, production-oriented backend foundation in which authentication, access control, request validation, and database integrity are established before application features are added.

## 1. Objective

Develop a secure backend foundation that demonstrates how to build application APIs directly against PostgreSQL while maintaining clear security boundaries, reliable data operations, and maintainable business logic.

Application teams frequently implement authentication and authorization after creating their core functionality. This often results in routes that enforce inconsistent permissions, endpoints that trust user-supplied identifiers, loosely validated request bodies, duplicated SQL logic, and database operations that can leave partially updated records.

This project should establish the correct engineering foundation before those problems emerge.

The platform must demonstrate how to:

1. Authenticate users using a maintained, secure authentication mechanism.
2. Enforce authorization for every protected operation.
3. Validate request bodies, path parameters, and query parameters at runtime.
4. Connect an API server directly to PostgreSQL using a controlled database access layer.
5. Write safe SQL using parameterized queries.
6. Design relational schemas with constraints, relationships, and indexes.
7. Use transactions for multi-step operations that must succeed or fail together.
8. Prevent unauthorized access through manipulated resource identifiers.
9. Handle sessions, errors, concurrency, and database failures predictably.
10. Document APIs with explicit request and response contracts.
11. Test authentication, authorization, validation, and database integrity automatically.
12. Provide a reproducible foundation that other application features can extend without bypassing its security controls.

**Core principle:** Authentication establishes who is making a request. Authorization determines what that identity may do. Validation determines whether the request is acceptable. PostgreSQL constraints and transactions preserve data integrity. All four must work together.

## 2. Project Scope

Build a small but complete backend application that demonstrates security-first application engineering rather than an authentication demo with a few unprotected database routes.

The initial application should include a practical resource-management domain, such as a secure workspace and task API, so that permissions and data relationships can be tested against real workflows.

### 2.1 Required capabilities

| Capability | Required behavior |
|---|---|
| Authentication | Secure registration, login, logout, and session validation |
| Authorization | Centralized permission checks for protected operations |
| Request validation | Runtime validation of all untrusted inputs |
| API design | Versioned, documented REST endpoints |
| PostgreSQL access | Explicit, safe SQL through a controlled data-access layer |
| Database integrity | Foreign keys, unique constraints, checks, and indexes |
| Transaction management | Atomic execution of related operations |
| Error handling | Consistent, safe API errors |
| Session security | Expiration, invalidation, and appropriate cookie settings |
| Access isolation | Prevent unauthorized access to other users' resources |
| Concurrency | Detect conflicting updates where required |
| Logging | Structured operational logs without secrets |
| Testing | Unit, integration, authorization, and end-to-end tests |
| Documentation | Setup guide, schema, permission policy, and OpenAPI specification |

### 2.2 Non-goals

The initial release does not need a complex microservice architecture, a custom authentication protocol, a custom cryptographic implementation, or an elaborate user interface.

Do not build a custom password-hashing algorithm, implement a proprietary session-token format without need, or introduce an ORM merely to hide important SQL behavior from developers.

The objective is to understand and implement the boundaries between HTTP, application logic, authentication, authorization, SQL, and PostgreSQL.

## 3. Recommended Technical Stack

Use a TypeScript-first backend and a direct PostgreSQL connection through a maintained driver.

| Layer | Recommended technology |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| HTTP framework | Fastify or Express |
| Database | PostgreSQL |
| Database driver | `pg` (`node-postgres`) |
| Request validation | Zod |
| Password hashing | Argon2id or an appropriately configured bcrypt implementation |
| Authentication | Maintained authentication library or secure server-managed sessions |
| Session storage | PostgreSQL or another appropriate durable store |
| API documentation | OpenAPI 3.x |
| Unit and integration testing | Vitest or Jest |
| HTTP integration testing | Fastify inject, Supertest, or an equivalent supported client |
| End-to-end testing | Playwright where a browser interface exists |
| Database migrations | A maintained migration tool or reviewed SQL migration files |
| Local infrastructure | Docker Compose where useful |
| CI/CD | The existing repository's continuous integration platform |

Use direct SQL with the PostgreSQL driver for the core data-access implementation. The application should make SQL queries, constraints, and transaction boundaries understandable rather than hiding them behind a general-purpose ORM.

A frontend is optional for the initial backend foundation. A small interface or API client may be added later to demonstrate authentication and protected workflows.

## 4. Architecture

Separate the HTTP layer, validation, authentication, authorization, business logic, and SQL access so each responsibility can be tested independently.

```text
Client / API Consumer
         |
         v
     HTTP Server
         |
         v
 Request Parsing and Validation
         |
         v
 Authentication / Session Validation
         |
         v
   Authorization Policies
         |
         v
    Business Services
         |
         v
     Data-Access Layer
         |
         v
   Parameterized SQL
         |
         v
      PostgreSQL
         |
         v
 Constraints, Transactions,
 Indexes, and Persistent Data
```

Cross-cutting components:

- Centralized error handling
- Structured logging and request IDs
- Rate limiting
- Session management
- Database migrations
- API documentation
- Automated tests
- Health checks
- Secret and environment configuration

### Architecture rules

**HTTP handlers** should translate HTTP requests into validated application operations and documented responses.

**Validation schemas** should define the accepted structure and constraints of each operation.

**Authentication middleware** should establish the authenticated identity.

**Authorization policies** should determine whether the current identity can perform a specific operation on a specific resource.

**Application services** should implement business rules and coordinate related operations.

**Data-access functions** should encapsulate parameterized SQL and mapping between database rows and application models.

**PostgreSQL** should enforce important data invariants that must remain true regardless of which API route is used.

Do not combine all these responsibilities into one large route handler. Do not duplicate slightly different authorization checks across unrelated endpoints.

## 5. Define the Security Model First

Before implementing application features, define the identities, resources, permissions, and trust boundaries.

### 5.1 Trust boundaries

Treat all client-controlled inputs as untrusted, including:

- URL parameters
- Query parameters
- Request bodies
- Request headers other than those validated by the server
- Cookie values before session validation
- Resource identifiers
- Role names
- Organization or workspace identifiers
- Values read from external systems

A value supplied by the client can identify a requested resource, but it cannot establish that the caller is allowed to access that resource.

For example, changing `/api/v1/tasks/task_123` to `/api/v1/tasks/task_456` must not grant access to another user's task.

### 5.2 Authentication versus authorization

Authentication answers:

**Who is making this request?**

Authorization answers:

**Is that identity permitted to perform this operation on this resource in its current state?**

Validation answers:

**Does this request contain acceptable data?**

Database integrity answers:

**Can this operation preserve the invariants that must remain true in persistent storage?**

These are different controls and should not be treated as substitutes for one another.

### 5.3 Initial roles

For the initial application, support a simple user-owned resource model, optionally extended with workspace membership.

Example roles:

| Role | Purpose |
|---|---|
| Owner | Manage all resources and settings within the permitted scope |
| Member | Perform permitted operations on assigned or accessible resources |
| Viewer | Read permitted resources without modifying them |

Define each operation's permissions explicitly.

Avoid writing a policy such as "members can update resources" without determining whether it means all resources, their own resources, assigned resources, or resources in a shared workspace.

## 6. PostgreSQL Data Model

Use a relational model that expresses ownership and important business constraints clearly.

### 6.1 Users

Create a `users` table with fields such as:

- `id`
- `email`
- `display_name`
- `password_hash`, if passwords are managed locally
- `status`
- `created_at`
- `updated_at`

Requirements:

- Use a stable primary key.
- Enforce appropriate email uniqueness.
- Normalize email handling according to a documented policy.
- Never store plaintext passwords.
- Never expose password hashes in ordinary API responses.
- Use appropriate database types and constraints.
- Avoid using email address alone as a permanent reference for all business relationships.

If authentication is delegated to an identity provider, model the provider identity appropriately instead of implementing a second, unnecessary password system.

### 6.2 Sessions

For a server-managed session approach, create a `sessions` table with fields such as:

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `created_at`
- `last_seen_at`
- `revoked_at`

Store only a hash of the usable session token when implementing opaque bearer sessions. Generate tokens with a cryptographically secure random generator.

Enforce appropriate foreign keys and indexes for session lookup and expiration cleanup.

Do not store reusable session secrets in application logs or return them from session-inspection endpoints.

### 6.3 Resources

Use a concrete domain entity, such as `tasks`, to demonstrate ownership and authorization.

Proposed fields:

- `id`
- `owner_id`
- `workspace_id`, if shared workspaces are included
- `title`
- `description`
- `status`
- `created_at`
- `updated_at`
- `version`
- `deleted_at`, if soft deletion is implemented

The resource should have a documented lifecycle and a clear authorization policy.

### 6.4 Workspace membership, if applicable

A shared-workspace model may include:

**Workspaces**

- `id`
- `name`
- `created_by`
- `created_at`
- `updated_at`

**WorkspaceMemberships**

- `workspace_id`
- `user_id`
- `role`
- `created_at`

Enforce uniqueness on `(workspace_id, user_id)` and use foreign keys to preserve valid relationships.

Do not add a workspace model unless the application actually needs shared ownership. The security foundation must remain understandable.

### 6.5 Database constraints

Use PostgreSQL to protect important invariants.

Examples:

- `NOT NULL` for required values.
- `UNIQUE` for unique identifiers and memberships.
- `FOREIGN KEY` for valid relationships.
- `CHECK` for supported values and quantity constraints.
- Appropriate defaults for server-generated timestamps.
- Indexes for frequently filtered and joined fields.

For example, a task status could be constrained to supported initial values. If the application supports configurable statuses, model that relationship explicitly rather than hard-coding a fixed check constraint that contradicts the product's requirements.

### 6.6 Database naming and conventions

Adopt consistent conventions:

- `snake_case` for PostgreSQL identifiers.
- `created_at` and `updated_at` for timestamps.
- `uuid` or another deliberate primary-key type.
- Explicit foreign-key names where useful.
- UTC-aware timestamps, normally using `timestamptz` for event times.
- Documented handling of nullable fields.

Do not mix timezone-naive timestamps and timezone-aware timestamps without a clear reason.

## 7. PostgreSQL Connections and Query Safety

Direct database access requires disciplined query construction and transaction management.

### 7.1 Connection pooling

Use a maintained PostgreSQL driver and a controlled connection pool.

Configure:

- Maximum pool size
- Connection timeout
- Idle connection handling
- Statement or query timeout where appropriate
- Application shutdown behavior
- Error handling for connection failures

The pool should be sized according to the application and database capacity. Do not allow unbounded connections or create a new database connection for every request.

### 7.2 Parameterized SQL

All values derived from user input must be passed as parameters rather than concatenated into SQL strings.

Example with `pg`:

```typescript
const result = await pool.query(
  `
    SELECT id, owner_id, title, status, created_at
    FROM tasks
    WHERE id = $1
      AND owner_id = $2
      AND deleted_at IS NULL
  `,
  [taskId, currentUser.id]
);
```

The query is parameterized, and the access scope is expressed in the query itself.

Never build a query like this:

```typescript
// Unsafe: untrusted input is inserted into SQL.
const sql = `SELECT * FROM tasks WHERE id = '${taskId}'`;
```

Parameterization prevents user-controlled values from being interpreted as SQL syntax. It does not automatically solve authorization, input validation, or all dynamic-query problems.

### 7.3 Dynamic column names and sorting

SQL parameters represent values, not arbitrary table or column identifiers.

For sorting or selecting from an allowed set of fields, use a server-controlled allowlist.

```typescript
const sortColumns = {
  createdAt: "created_at",
  title: "title",
  status: "status"
} as const;

type SortField = keyof typeof sortColumns;

function getSortColumn(value: string): string {
  if (Object.hasOwn(sortColumns, value)) {
    return sortColumns[value as SortField];
  }

  throw new Error("Unsupported sort field");
}
```

Only a validated entry from the predefined allowlist should be interpolated into SQL. Client-provided arbitrary column names, directions, table names, or expressions must never be inserted directly.

### 7.4 Avoid unnecessary over-fetching

Select the fields needed by the operation rather than always returning `SELECT *`.

Benefits include:

- Less accidental exposure of sensitive fields.
- More explicit data contracts.
- Reduced data transfer.
- Easier schema evolution.
- Clearer authorization review.

Password hashes, session data, and internal authorization metadata should not be included in ordinary resource queries unless the operation genuinely needs them.

## 8. Authentication Implementation

### 8.1 Preferred approach

Use a maintained authentication library or an established identity provider when appropriate.

The application must still enforce server-side authentication and authorization even if the authentication library handles password verification or session management.

Do not implement custom cryptography or invent a token protocol.

### 8.2 Local account authentication

If local password authentication is required:

- Hash passwords using Argon2id or a securely configured alternative.
- Verify passwords using the selected library.
- Use rate limits on authentication attempts.
- Avoid account-enumeration leaks through error messages.
- Never log passwords or password hashes.
- Support logout and session invalidation.
- Apply a password-reset workflow if that feature is included.
- Avoid rolling your own password-storage format.

### 8.3 Browser session security

For a browser-based application, prefer server-managed sessions with appropriately configured cookies.

Set relevant protections such as:

- `HttpOnly`
- `Secure` in HTTPS deployments
- Appropriate `SameSite` behavior
- An appropriate cookie path and lifetime

Choose CSRF protection based on the authentication architecture and the browser's cross-origin behavior.

Do not put long-lived session credentials into browser local storage merely for convenience.

### 8.4 Session lifecycle

Test:

- Successful login creates an authenticated session.
- Invalid credentials are rejected.
- Logout invalidates the session.
- Expired sessions cannot access protected endpoints.
- Revoked sessions are rejected.
- Session lookup cannot authenticate a user solely from an unverified cookie value.
- Deactivated users are handled according to the defined policy.

If JWT-based authentication is chosen instead, document token expiration, signature verification, key management, refresh-token behavior, revocation strategy, and where JWTs are stored. Do not assume JWTs eliminate the need for authorization checks.

## 9. Authorization Architecture

Authorization must be centralized, explicit, and testable.

### 9.1 Permission policies

Define policies such as:

- `canCreateTask`
- `canReadTask`
- `canUpdateTask`
- `canDeleteTask`
- `canManageWorkspace`
- `canManageMembership`

Each policy should consider the authenticated identity, resource ownership, workspace membership, role, and relevant resource state.

### 9.2 Resource-scoped queries

Whenever possible, scope protected queries to the authorized user or workspace.

For example:

```typescript
const result = await pool.query(
  `
    SELECT id, owner_id, title, status, created_at, updated_at
    FROM tasks
    WHERE id = $1
      AND owner_id = $2
      AND deleted_at IS NULL
  `,
  [taskId, currentUser.id]
);
```

This pattern helps prevent accidental reads that retrieve an arbitrary record before authorization is checked.

For workspace-owned resources, validate both the workspace scope and the current user's membership.

### 9.3 Update authorization

An update must verify authorization at the point the mutation is performed.

Do not rely only on a previous frontend check or an earlier API request because permissions or resource state may have changed.

For sensitive operations, consider combining the relevant ownership or version check with the database mutation itself.

### 9.4 Prevent privilege escalation

Never trust a client-supplied role field such as:

```json
{
  "role": "admin"
}
```

A role update must be a distinct, authorized operation with explicit policy enforcement.

Ordinary resource-creation and update endpoints must not allow a caller to change their `owner_id`, `workspace_id`, role, or other server-controlled fields unless the operation is specifically authorized to do so.

### 9.5 Not-found versus forbidden

For inaccessible resources, decide whether the API should return `403 Forbidden` or intentionally return `404 Not Found` to avoid revealing resource existence.

Apply the policy consistently and test it.

A `404` response does not itself prevent unauthorized access; the authorization check and query scope must still be correct.

## 10. Input Validation

Validate all untrusted inputs at the API boundary, even when the frontend performs identical checks.

### 10.1 Validation categories

Validate:

- Request body structure
- Path parameters
- Query parameters
- Identifier formats
- Required fields
- String length
- Enum values
- Numeric ranges
- Date and timestamp formats
- Pagination limits
- Sorting allowlists
- Resource relationships
- State transitions
- Request body size

### 10.2 Example schema

Using Zod:

```typescript
import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).nullable().optional(),
  status: z.enum(["todo", "in_progress", "done"])
}).strict();

export type CreateTaskInput =
  z.infer<typeof createTaskSchema>;
```

The specific field limits and status values are initial design decisions and should be aligned with the actual application requirements.

Use strict schemas for write operations where unexpected fields should be rejected rather than silently accepted.

### 10.3 Separate validation from authorization

A request may be valid but unauthorized.

For example, a correctly formed request to modify another user's resource should still be denied.

Likewise, an authorized user can submit an invalid status or an excessively large field. Authorization does not make that input valid.

Test both cases independently.

### 10.4 Semantic validation

Some rules need more than schema validation:

- A workspace must exist.
- The caller must belong to the workspace.
- A task status transition must be permitted.
- A referenced resource must be in the correct state.
- A unique value must not already exist.
- The operation must not violate a cross-record invariant.

Implement these checks in the appropriate service and transaction boundary, with database constraints supporting the invariants where practical.

## 11. API Design

Expose a consistent API under `/api/v1`.

### 11.1 Authentication endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register` | Register an account, if self-registration is supported |
| POST | `/api/v1/auth/login` | Authenticate and establish a session |
| POST | `/api/v1/auth/logout` | Invalidate the current session |
| GET | `/api/v1/me` | Retrieve the authenticated user's profile |

### 11.2 Resource endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/tasks` | List authorized tasks |
| POST | `/api/v1/tasks` | Create a task |
| GET | `/api/v1/tasks/:taskId` | Retrieve an authorized task |
| PATCH | `/api/v1/tasks/:taskId` | Update permitted task fields |
| DELETE | `/api/v1/tasks/:taskId` | Delete or archive a task according to policy |

### 11.3 Workspace endpoints, if implemented

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/workspaces` | List accessible workspaces |
| POST | `/api/v1/workspaces` | Create a workspace |
| GET | `/api/v1/workspaces/:workspaceId` | Retrieve an authorized workspace |
| PATCH | `/api/v1/workspaces/:workspaceId` | Update permitted workspace fields |
| GET | `/api/v1/workspaces/:workspaceId/members` | List authorized memberships |

Treat these as proposed logical contracts. Only document and expose operations implemented and tested in the actual application.

### 11.4 API contract requirements

Every endpoint must specify:

- Authentication requirements
- Authorization policy
- Path and query parameters
- Request schema
- Successful response schema
- Validation error behavior
- Authentication and permission error behavior
- Missing-resource behavior
- Pagination and sorting rules
- Relevant state-transition constraints
- Idempotency expectations where applicable

### 11.5 Request handling pipeline

Use a consistent processing pipeline:

1. Parse the request.
2. Validate the basic request structure.
3. Authenticate the caller where required.
4. Validate the relevant resource identifiers.
5. Evaluate the required authorization policy.
6. Execute the application operation.
7. Commit the database transaction where applicable.
8. Return a documented response.

A server may reject malformed requests before authentication, but it must not reveal protected resource information through validation errors.

### 11.6 Error response

Use a consistent error format, for example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "title",
        "code": "TOO_SHORT"
      }
    ],
    "requestId": "req_example"
  }
}
```

Use stable error codes, appropriate HTTP status codes, and sanitized messages.

Do not return SQL statements, database connection strings, stack traces, secrets, or raw internal exceptions.

### 11.7 API documentation

Maintain an OpenAPI 3.x specification containing:

- Authentication scheme
- Endpoints and methods
- Request and response schemas
- Error contracts
- Authorization requirements
- Pagination conventions
- Validation limits
- Example requests and responses

Where practical, validate the specification in CI and test the implementation against the same schemas.

## 12. Database Integrity and Transaction Management

This is one of the most important engineering components of the project.

### 12.1 Use constraints as a second line of defense

Implement appropriate foreign keys, uniqueness constraints, check constraints, and not-null requirements.

For example:

- Every task must reference a valid owner.
- A membership pair must be unique.
- A task status must be supported.
- A resource must not reference a nonexistent workspace.
- A unique application identifier must not be duplicated.

Application-level validation improves error messages; database constraints protect the persistent state even when application logic has a defect or an operation races with another request.

### 12.2 When transactions are required

Use PostgreSQL transactions when a business operation involves multiple changes that must remain consistent.

Examples:

- Creating a resource and its mandatory audit event.
- Changing an owner and recording the required ownership history.
- Creating a workspace and assigning its initial Owner.
- Updating a resource and its related records.
- Checking and consuming a limited resource under concurrent requests.

A transaction should succeed completely or roll back completely where the operation requires atomicity.

### 12.3 Transaction example

```typescript
import type { Pool } from "pg";

interface CreateTaskInput {
  title: string;
  status: "todo" | "in_progress" | "done";
}

export async function createTask(
  pool: Pool,
  ownerId: string,
  input: CreateTaskInput
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const taskResult = await client.query(
      `
        INSERT INTO tasks (owner_id, title, status)
        VALUES ($1, $2, $3)
        RETURNING id, owner_id, title, status, created_at
      `,
      [ownerId, input.title, input.status]
    );

    const task = taskResult.rows[0];

    await client.query(
      `
        INSERT INTO audit_events (
          actor_id,
          action,
          resource_type,
          resource_id
        )
        VALUES ($1, $2, $3, $4)
      `,
      [ownerId, "task.created", "task", task.id]
    );

    await client.query("COMMIT");

    return task;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

This is illustrative code; adapt the columns, input validation, error mapping, and audit requirements to the implemented schema.

Every query within a transaction must use the same checked-out database client. Do not issue transactional queries through the shared pool and assume they belong to the same transaction.

### 12.4 Transaction limitations

Do not keep database transactions open while waiting on slow external services or user interaction.

External calls cannot be rolled back by a PostgreSQL transaction. For operations spanning database state and external services, use explicit state transitions, idempotency, and reconciliation instead of pretending the whole workflow is atomic.

### 12.5 Isolation and concurrency

Understand when an ordinary transaction is sufficient and when stronger concurrency control is needed.

Use approaches such as:

- Conditional updates
- Row-level locks
- Unique constraints
- Optimistic version checks
- Suitable transaction isolation

For example, an update that should succeed only when a task remains at a specific version can include the expected version in its `WHERE` clause. If no row is affected, return a documented conflict response.

Do not assume that two separate `SELECT` and `UPDATE` statements are race-free merely because they are executed close together.

## 13. PostgreSQL Row-Level Security

PostgreSQL Row-Level Security (RLS) can provide an additional layer of data isolation when implemented carefully.

### 13.1 When to consider RLS

Consider RLS when the application has organization-scoped or user-scoped tables and the database architecture can reliably establish the security context of each operation.

Policies can restrict which rows are visible or modifiable under a defined database session context.

### 13.2 Implementation requirements

If RLS is used:

- Enable it explicitly on the relevant tables.
- Define and review policies for reads, inserts, updates, and deletes.
- Understand the behavior of table owners, superusers, and roles with `BYPASSRLS`.
- Use `FORCE ROW LEVEL SECURITY` where the intended design requires applicable table owners to be subject to policies.
- Use a runtime database role with the minimum required privileges.
- Establish tenant context safely for each transaction.
- Reset or isolate context when connections return to the pool.
- Test missing, invalid, and deliberately changed tenant context.
- Test background jobs and administrative operations separately.

RLS does not automatically know which application user is authenticated. The application must establish the security context correctly.

### 13.3 Connection pooling hazards

If tenant information is stored in a PostgreSQL session setting, pooled connections may be reused.

Use transaction-scoped settings where appropriate, and ensure that context cannot leak from one request to another.

Avoid relying on session variables that remain set after a request unless the lifecycle is deliberately controlled and tested.

### 13.4 Defense in depth

Even with RLS enabled, keep application-level authorization checks and resource-scoped SQL.

RLS is a second protection layer, not an excuse to omit permissions from the application architecture.

Do not add RLS mechanically if the current connection or tenant-context model cannot support it safely. Document the decision and implement the strongest reliable alternative for the initial release.

## 14. Logging, Errors, and Observability

### 14.1 Structured logging

Include useful operational fields such as:

- Request ID
- Route
- HTTP method
- Status code
- Request duration
- Error category
- Relevant resource identifier where appropriate

Do not log passwords, session tokens, authorization headers, raw database credentials, or unnecessarily sensitive request bodies.

### 14.2 Error classification

Distinguish between:

- Validation failures
- Authentication failures
- Authorization failures
- Missing resources
- State conflicts
- Database constraint violations
- Transient database failures
- Unexpected internal errors

Map known errors to predictable HTTP responses without exposing internal implementation details.

### 14.3 Database errors

Do not return the raw PostgreSQL error to the client.

Log a sanitized internal diagnostic with a request ID, map known constraint violations to appropriate responses, and return a stable error contract.

For example, a unique-constraint conflict may produce a `409 Conflict` response where appropriate, but clients should not receive the underlying table or internal database details unless specifically intended by the API contract.

### 14.4 Health and readiness

Provide appropriate operational endpoints such as:

- Liveness check: whether the process is running.
- Readiness check: whether the application can serve requests and its critical dependencies are usable.

Do not expose database credentials, internal topology, or detailed sensitive diagnostics through public health endpoints.

## 15. Testing Strategy

The test suite must validate both successful behavior and attempts to bypass security or corrupt persistent state.

### 15.1 Unit tests

Test:

- Runtime validation schemas
- Permission policy functions
- Business rules
- State-transition validation
- Error mapping
- Pagination and sorting allowlists
- Resource ownership decisions
- Version-conflict logic

Mock dependencies only where the test is intended to isolate the unit under test.

### 15.2 PostgreSQL integration tests

Use a real test PostgreSQL database or an isolated equivalent that verifies actual SQL behavior and database constraints.

Test:

- Database migrations
- User and session persistence
- Resource CRUD operations
- Foreign-key violations
- Uniqueness constraints
- Check constraints
- Transaction commit and rollback
- Parameterized query behavior
- Concurrency-sensitive updates
- Connection-pool behavior
- RLS policies where implemented

Do not rely only on mocks when the objective is to verify SQL or PostgreSQL-specific behavior.

### 15.3 Authentication tests

Verify:

- Successful authentication.
- Invalid credential handling.
- Session expiry.
- Session revocation.
- Logout.
- Access to protected routes.
- Handling of disabled accounts.
- Rejection of invalid session tokens.

### 15.4 Authorization tests

At minimum:

1. A user can read their own permitted resources.
2. A user cannot read another user's private resource.
3. A user cannot update another user's private resource.
4. A user cannot delete another user's private resource.
5. Changing a resource ID cannot bypass access control.
6. A user cannot elevate privileges through ordinary update endpoints.
7. A Viewer cannot perform forbidden mutations.
8. Workspace membership is verified on protected shared-resource operations.
9. List and search endpoints do not leak inaccessible records.
10. Unauthorized operations do not produce unintended database changes.

### 15.5 SQL injection and input tests

Verify that:

- SQL-looking strings are treated as data.
- Dynamic sorting accepts only allowlisted fields.
- Malformed IDs are rejected according to the API contract.
- Oversized inputs are rejected.
- Unexpected fields cannot overwrite privileged state.
- Invalid payloads do not cause partial database writes.
- Query parameters cannot alter the intended SQL structure.

Parameterized queries are essential, but tests must also verify safe construction of dynamic identifiers and correct authorization behavior.

### 15.6 Transaction and concurrency tests

Test:

- A failure after the first write rolls back the complete operation.
- Required audit records are not missing after a successful transaction.
- Duplicate requests are handled according to the contract.
- Concurrent updates do not silently overwrite protected state.
- Unique constraints protect duplicate records under concurrency.
- RLS context cannot leak between pooled connections if RLS is enabled.

### 15.7 End-to-end API workflow

A representative test sequence should:

1. Create or provision two test users.
2. Authenticate both users.
3. Create a resource as User A.
4. Retrieve it as User A.
5. Attempt to retrieve it as User B.
6. Attempt to modify it as User B.
7. Verify that both unauthorized operations are rejected.
8. Verify that the database record remains unchanged.
9. Log out User A and verify that the revoked session cannot read the resource.
10. Confirm that error responses match the documented API contract.

This demonstrates more than a route returning `401` or `403`: it proves that unauthorized actions cannot change protected state.

## 16. API Documentation and Security Documentation

Maintain these documents as part of the project:

### `docs/architecture.md`

Document the application layers, trust boundaries, database interaction model, and transaction strategy.

### `docs/authentication.md`

Document the selected authentication mechanism, session lifecycle, expiration, logout, and relevant cookie or token security controls.

### `docs/authorization-matrix.md`

List each protected operation and the roles or resource relationships that permit or deny it.

### `docs/database-schema.md`

Describe each table, its relationships, required fields, constraints, and indexes.

### `docs/sql-safety.md`

Explain parameterized SQL, safe dynamic sorting, database privileges, transaction usage, and the limits of input validation.

### `docs/api.md`

Document API routes, schemas, success responses, error behavior, pagination, and authentication requirements. Generate or maintain an OpenAPI 3.x specification where practical.

### `docs/testing.md`

Explain how to provision the test database, run migrations, execute the test suites, and interpret the results.

### `docs/threat-model.md`

Describe major threats such as unauthorized resource access, SQL injection, session theft, privilege escalation, database credential exposure, and cross-tenant data leakage.

## 17. Repository Structure

Use a maintainable structure similar to the following:

```text
secure-api-foundation/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   └── env.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── tasks.routes.ts
│   │   └── workspaces.routes.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── authorize.ts
│   │   ├── validate.ts
│   │   └── error-handler.ts
│   ├── schemas/
│   │   ├── auth.schema.ts
│   │   ├── task.schema.ts
│   │   └── workspace.schema.ts
│   ├── policies/
│   │   ├── task.policy.ts
│   │   └── workspace.policy.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── task.service.ts
│   │   └── workspace.service.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── session.repository.ts
│   │   └── task.repository.ts
│   ├── db/
│   │   ├── pool.ts
│   │   └── transaction.ts
│   ├── errors/
│   │   └── app-error.ts
│   └── lib/
├── db/
│   ├── migrations/
│   └── seeds/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   └── e2e/
├── docs/
│   ├── architecture.md
│   ├── authentication.md
│   ├── authorization-matrix.md
│   ├── database-schema.md
│   ├── sql-safety.md
│   ├── threat-model.md
│   └── openapi.yaml
├── .env.example
├── package.json
└── README.md
```

Adapt the structure to the selected framework instead of forcing a particular directory layout. Preserve the separation between route handling, policies, business logic, and SQL.

## 18. Implementation Roadmap

### Phase 1: Repository Inspection and Security Design

- Inspect the existing codebase, dependencies, route structure, database setup, and scripts.
- Document the trust boundaries.
- Define the initial user and resource models.
- Identify the required roles and permissions.
- Choose the authentication approach.
- Establish API response conventions.
- Design the initial schema and migrations.

**Exit criterion:** The application has an explicit security model and a reviewed database foundation.

### Phase 2: PostgreSQL Foundation

- Configure a controlled database connection pool.
- Create migrations for the core tables.
- Add constraints and indexes.
- Implement parameterized SQL repositories.
- Implement safe transaction helpers where appropriate.
- Add schema and migration tests.
- Provide a reproducible test database setup.

**Exit criterion:** The application can perform safe SQL operations and preserve the defined data invariants.

### Phase 3: Authentication and Sessions

- Implement the selected authentication mechanism.
- Add registration if required.
- Implement login and logout.
- Add session validation and invalidation.
- Protect private endpoints.
- Add authentication tests.
- Verify secrets handling and session storage.

**Exit criterion:** Protected endpoints reject unauthenticated and invalidly authenticated requests.

### Phase 4: Authorization and Validation

- Implement centralized authorization policies.
- Add request schemas.
- Enforce owner and workspace boundaries.
- Prevent role and ownership manipulation.
- Implement consistent error handling.
- Add negative authorization tests.
- Verify that denied requests leave the database unchanged.

**Exit criterion:** Permissions and validation are enforced by the backend, independently of the frontend.

### Phase 5: Resource API and Transactions

- Implement resource creation, reading, updating, and deletion.
- Add resource-scoped SQL queries.
- Define transaction boundaries.
- Add audit records for required operations.
- Implement optimistic concurrency where needed.
- Add database integration and conflict tests.

**Exit criterion:** The API supports the core workflow without violating ownership, integrity, or transaction requirements.

### Phase 6: Hardening and Optional RLS

- Review SQL safety and dynamic query construction.
- Test connection-pool behavior.
- Introduce RLS if the chosen architecture supports it reliably.
- Add rate limiting and operational logging.
- Verify database least privilege.
- Test authentication and authorization failure paths.
- Document residual risks.

**Exit criterion:** The implemented security controls have repeatable test evidence and documented limitations.

### Phase 7: Documentation and Release

- Finalize the OpenAPI contract.
- Document authentication and permission rules.
- Write clean-environment setup instructions.
- Run linting, type checking, migrations, builds, and all required tests.
- Verify operational health checks.
- Produce a final verification report.

**Exit criterion:** Another developer can install, run, test, and extend the foundation using the documented process.

## 19. Acceptance Criteria

### Authentication

- The chosen authentication mechanism works through the documented flow.
- Invalid or expired sessions are rejected.
- Logout invalidates the relevant session.
- Secrets and password hashes are not exposed through ordinary endpoints.

### Authorization

- Every protected operation enforces its permission policy.
- User-controlled IDs cannot bypass resource ownership checks.
- Role escalation attempts are denied.
- List, detail, search, and mutation endpoints enforce consistent access rules.
- Unauthorized requests do not mutate the underlying data.

### PostgreSQL

- SQL values are parameterized.
- Dynamic identifiers are allowlisted.
- Constraints protect required invariants.
- Transactions roll back incomplete multi-step operations.
- Migrations are reproducible.
- Integration tests exercise actual PostgreSQL behavior.

### Validation and API contracts

- All untrusted request inputs are validated on the server.
- Unexpected privileged fields are rejected.
- Success and error responses follow documented schemas.
- HTTP status codes are consistent.
- OpenAPI documentation reflects implemented behavior.

### Reliability and maintainability

- Query and business logic are separated from route handlers.
- Errors are mapped safely and consistently.
- Connections are managed through a controlled pool.
- Concurrency-sensitive operations have defined behavior.
- Logging does not expose secrets.
- Tests cover critical security and data-integrity cases.

### Documentation and delivery

- The repository includes setup and testing instructions.
- The authentication and authorization model is documented.
- The database schema and constraints are documented.
- Test results are based on commands actually executed.
- Known gaps and unverified assumptions are disclosed.

