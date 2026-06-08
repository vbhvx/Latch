# Threat Model & Security Posture

## 1. Overview & Methodology

This threat model outlines the primary attack vectors, threat actors, and mitigations incorporated into **Latch**, structured according to the STRIDE framework (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).

---

## 2. Threat Analysis & Mitigations

### 2.1 Spoofing (Identity Theft & Session Hijacking)
- **Threat:** Attacker intercepts, forges, or steals user session credentials to impersonate legitimate users.
- **Mitigations:**
  - Sessions are generated using high-entropy 256-bit cryptographic random tokens (`crypto.randomBytes(32)`).
  - Bearer tokens are stored exclusively as SHA-256 hashes in PostgreSQL; even a complete database compromise does not yield active session tokens.
  - Browser sessions use `HttpOnly`, `SameSite=Lax`, and `Secure` cookies, preventing exfiltration through XSS.
  - Constant-time verification on non-existent accounts defeats timing attacks during password authentication.

### 2.2 Tampering (Data Manipulation & SQL Injection)
- **Threat:** Attacker injects malicious SQL tokens into parameters or manipulates JSON bodies to alter unauthorized database state.
- **Mitigations:**
  - 100% of user-controlled inputs are passed through parameterized SQL queries (`$1, $2, ...`). Direct string interpolation in SQL is banned.
  - Dynamic sort fields are validated against strict compile-time dictionaries.
  - Request body schemas enforce Zod `.strict()`, rejecting unmodeled attributes (preventing mass assignment and parameter pollution).
  - Multi-step database mutations are wrapped in ACID transactions.

### 2.3 Repudiation (Action Deniability)
- **Threat:** User performs an unauthorized or destructive action and denies responsibility.
- **Mitigations:**
  - Mandatory audit events are written transactionally in `audit_events` for all key mutations (`user.registered`, `workspace.created`, `member.added`, `task.created`, `task.updated`, `task.deleted`).
  - Audit logging is atomic with the mutation; if the audit event write fails, the entire transaction rolls back.

### 2.4 Information Disclosure (Cross-Tenant Leakage & Resource Enumeration)
- **Threat:** Attacker probes resource IDs (e.g. `/api/v1/tasks/:id`) or list endpoints to discover existing resources or read other tenants' data.
- **Mitigations:**
  - Centralized policies and resource-scoped queries ensure callers only access records within their permitted workspace memberships.
  - Access attempts to inaccessible resources return `404 Not Found` rather than `403 Forbidden`, eliminating resource existence oracle attacks.
  - Error responses are sanitized; database connection strings, SQL statements, and internal stack traces are strictly stripped from client replies.
  - PostgreSQL Row-Level Security (RLS) provides engine-level data isolation.

### 2.5 Denial of Service (Brute Force & Resource Exhaustion)
- **Threat:** Attacker floods authentication routes with password guesses or overwhelms database connection capacity.
- **Mitigations:**
  - Tiered rate limiting with `@fastify/rate-limit` enforces quotas on general traffic (100 req/min) and strict limits on authentication routes (`/auth/login`, `/auth/register` at 10 req/min).
  - PostgreSQL connection pooling with bounded maximum pool size (`DATABASE_POOL_MAX`), connection timeouts, and statement timeouts (`DATABASE_STATEMENT_TIMEOUT_MS`).
  - Pagination limits (`limit` capped at 100) prevent unbounded queries.

### 2.6 Elevation of Privilege (Unauthorized Role Escalation)
- **Threat:** Standard member or viewer modifies request payload to set `{ "role": "owner" }` or updates someone else's resources.
- **Mitigations:**
  - Roles can only be modified through the dedicated `PATCH /workspaces/:id/members/:userId` endpoint, which verifies that the caller is an Owner in that workspace.
  - Task update and workspace update schemas strictly omit `role`, `owner_id`, and `workspace_id`.
  - A workspace must always retain at least one Owner; demoting or removing the last remaining owner is rejected with `409 Conflict`.
  - Viewers are strictly prohibited from performing create, update, or delete mutations.

---

## 3. Residual Risks & Future Considerations

| Residual Risk | Current Mitigation | Recommended Production Hardening |
|---|---|---|
| Distributed Brute Force | IP-based rate limiting on auth endpoints | Integrate CAPTCHA or external WAF/Cloudflare Turnstile after threshold |
| Password Compromise | Argon2id hashing | Add Multi-Factor Authentication (TOTP / WebAuthn) |
| Multi-Host Session Invalidation | Durable PostgreSQL session table | Implement Redis-backed distributed session cache with pub/sub invalidation |
| Database Superuser Connection | Documented non-superuser role `latch_app` | Provision runtime credentials via IAM / Secrets Manager restricted to `latch_app` |

