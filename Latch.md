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

