# Latch

[![CI](https://github.com/vbhvx/Latch/actions/workflows/ci.yml/badge.svg)](https://github.com/vbhvx/Latch/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%E2%89%A520-339933)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![License](https://img.shields.io/badge/license-MIT-blue)

**A multi-tenant task API where security is enforced in three independent layers — application policy, validated
input, and PostgreSQL itself.** Built with Fastify, TypeScript (strict), and raw parameterized SQL (no ORM hiding
the interesting parts).

> The question this project answers: _if a developer forgets an authorization check in one route, what stops a
> tenant from reading another tenant's data?_ In Latch, the database does.

## Highlights

|                      |                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Defense in depth** | Zod validation → centralized RBAC policies → PostgreSQL **row-level security** (`FORCE ROW LEVEL SECURITY`, tenant context via transaction-scoped `SET LOCAL`)  |
| **Authentication**   | Argon2id; 256-bit opaque session tokens stored only as SHA-256 digests; constant-time dummy verify to prevent account enumeration; cookie **and** bearer        |
| **Data integrity**   | FKs, check/unique constraints, case-insensitive email index, optimistic concurrency (`version`), transactional services with an audit trail                     |
| **Anti-enumeration** | Cross-tenant access returns `404`, not `403`; last-owner invariant prevents orphaned workspaces                                                                 |
| **Operability**      | Prometheus metrics, liveness/readiness probes, structured redacted logs with request IDs, graceful shutdown, session reaper                                     |
| **Delivery**         | Multi-stage non-root Docker image, compose stack with split admin/app DB roles, GitHub Actions CI (typecheck, lint, tests on real Postgres, audit, image build) |
| **Fail-safe config** | In production the process refuses to boot with insecure cookies, wildcard CORS, or placeholder secrets                                                          |

## Architecture

```
HTTP (Fastify + helmet + CORS + rate limit)
  └─ Zod validation (body / query / params, strict schemas)
      └─ authenticate  → session lookup by SHA-256(token)
          └─ policies   → workspacePolicy / taskPolicy  (pure, unit-tested)
              └─ services      → transaction boundaries, audit events
                  └─ repositories → parameterized SQL only
                      └─ PostgreSQL → constraints + RLS (runs as NOBYPASSRLS role)
```

Details: [architecture](docs/architecture.md) · [threat model](docs/threat-model.md) ·
[authorization matrix](docs/authorization-matrix.md) · [SQL safety](docs/sql-safety.md) ·
[schema](docs/database-schema.md) · [deployment & ops](docs/deployment.md) · [API](docs/api.md) /
[OpenAPI](docs/openapi.yaml)

### Design decisions worth discussing

- **No ORM.** SQL is the product here; dynamic identifiers (sort columns) go through an allow-list, everything
  else is positional parameters. The injection tests assert this against real payloads.
- **RLS as a backstop, not the primary check.** Policies are enforced for the runtime role; migrations run as a
  separate admin role. A superuser connection would silently bypass RLS, so the compose stack deliberately runs the
  API as `latch_app (NOBYPASSRLS)`.
- **Opaque sessions over JWTs.** Server-side sessions are instantly revocable (logout, deactivation) at the cost of
  one indexed lookup per request. Only the hash is stored, so a database leak doesn't yield usable tokens.
- **Optimistic concurrency.** Updates carry a `version`; a stale write gets `409` instead of a silent overwrite.
- **Migrations are a release step**, not app startup, so replicas never race.

## Quick start

```bash
# Full stack in containers (postgres → migrations → API)
export SESSION_SECRET=$(openssl rand -hex 32)
docker compose up --build
open http://localhost:3000/docs
```

Local development:

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run migrate && npm run seed      # seed users: alice@example.com / Password123! (dev only)
npm run dev
```

## Try it

```bash
BASE=http://localhost:3000/api/v1
TOKEN=$(curl -s $BASE/auth/login -H 'content-type: application/json' \
  -d '{"email":"alice@example.com","password":"Password123!"}' | jq -r .sessionToken)

curl -s $BASE/workspaces -H "authorization: Bearer $TOKEN" | jq
```

## Quality gates

```bash
npm run check   # typecheck (strict, noUncheckedIndexedAccess) + eslint + prettier + 78 tests
```

Tests run against a **real PostgreSQL** (no mocks for the database): unit, integration (transactions, constraints,
concurrency, SQL injection), security (authn, authz, RLS), and an end-to-end workflow. CI repeats this on every push
with a Postgres service container and also runs `npm audit` and builds the image. Statement coverage ≈ 77%.

## Configuration

Every variable is documented in [`.env.example`](.env.example) and validated at boot by
[`src/config/env.ts`](src/config/env.ts).

## Known limitations / roadmap

Honest scope notes, because "production-ready" is a spectrum:

- Rate limiting is in-memory per instance; horizontal scale needs a shared store (Redis) for global limits.
- No email verification, password reset, or MFA yet.
- The API authenticates by cookie _or_ bearer token. Cookies are `SameSite=Lax`; add CSRF tokens before serving a
  cross-site browser client.
- Coverage is strongest on the security-critical paths; service-layer edge cases have room to grow.

## License

MIT — see [LICENSE](LICENSE).
