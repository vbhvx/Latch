# Testing Strategy & Execution Guide

## 1. Overview

Latch employs an automated testing strategy covering every layer of the architecture:
- **Unit Tests:** Input validation schemas, authorization policy predicates, sorting allowlists, and cryptographic functions.
- **Database Integration Tests:** PostgreSQL schema integrity, foreign keys, unique constraints, check constraints, transaction commit/rollback, and optimistic concurrency.
- **Security & RBAC Tests:** Authentication lifecycle, session invalidation, cross-tenant isolation, ID manipulation, viewer restrictions, and privilege escalation prevention.
- **Engine-Level RLS Tests:** PostgreSQL Row-Level Security policies and connection pool context reset.
- **End-to-End Workflow:** The full 10-step representative security sequence from Section 15.7.

---

## 2. Test Environment Setup

### 2.1 Database Provisioning
The test suite operates directly against a real PostgreSQL instance (`latch_test`).

To create the test database locally:
```bash
createdb latch_test
```
Or run Docker:
```bash
docker compose up -d
```

### 2.2 Environment Configuration
In `.env` or during CI:
```env
NODE_ENV=test
TEST_DATABASE_URL=postgresql://vaibhavsaini@localhost:5432/latch_test
```

### 2.3 Automatic Migrations and Truncation
Before running any tests, `tests/setup.ts`:
1. Executes all pending migrations on `latch_test`.
2. Truncates all tables with `CASCADE` and resets sequences before test files run.

---

## 3. Running Automated Tests

### Run all tests
```bash
npm test
```

### Run specific test suites
```bash
# Run unit tests only
npx vitest run tests/unit

# Run database integration tests only
npx vitest run tests/integration

# Run security & authorization tests only
npx vitest run tests/security

# Run end-to-end workflow test only
npx vitest run tests/e2e
```

### Run test coverage report
```bash
npm run test:coverage
```

### Type checking
```bash
npm run typecheck
```

---

## 4. Test Suite Inventory

| Test Suite | File | Focus Area | Total Tests |
|---|---|---|:---:|
| **Crypto Utilities** | `tests/unit/crypto.test.ts` | Argon2id hashing, timing safety, 256-bit token entropy, SHA-256 digests | 4 |
| **Sorting Allowlists** | `tests/unit/sort.test.ts` | SQL column allowlist validation, direction validation, injection prevention | 4 |
| **Authorization Policies** | `tests/unit/policies.test.ts` | Workspace & Task policy matrices for Owner, Member, Viewer, Outsider | 8 |
| **Validation Schemas** | `tests/unit/schemas.test.ts` | Zod schemas, UUID formatting, strict mass-assignment rejection | 8 |
| **Database Constraints** | `tests/integration/db-constraints.test.ts` | Case-insensitive email index, foreign keys, status check constraints | 5 |
| **Transactions & Rollback** | `tests/integration/transactions.test.ts` | Atomic multi-step writes and clean rollback upon error | 2 |
| **Optimistic Concurrency**| `tests/integration/concurrency.test.ts` | OCC version incrementing and race-condition conflict detection | 2 |
| **SQL Injection** | `tests/integration/sql-injection.test.ts` | Parameterized SQL verification with tautology and DROP TABLE payloads | 2 |
| **Authentication Lifecycle**| `tests/security/authentication.test.ts` | Registration, login, logout, cookie settings, deactivated accounts | 8 |
| **Authorization & RBAC** | `tests/security/authorization.test.ts` | ID manipulation, cross-workspace isolation, viewer restrictions, privilege escalation | 13 |
| **Row-Level Security** | `tests/security/row-level-security.test.ts` | Engine-level PostgreSQL RLS filtering, connection pool context isolation | 2 |
| **End-to-End Workflow** | `tests/e2e/e2e-workflow.test.ts` | 10-step security & resource lifecycle verification matching Section 15.7 | 1 |
| **Total** | | | **59** |

