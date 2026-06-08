# Latch

Latch is a TypeScript backend for workspace-scoped task management. It exposes a Fastify API with authentication, workspaces, membership, tasks, health checks, rate limiting, and generated Swagger documentation.

## Architecture

The service is a conventional layered API:

- `src/routes` registers HTTP endpoints (`auth`, `workspace`, `task`, `health`, and UI/docs).
- `src/services`, `src/repositories`, and `src/policies` separate business rules, PostgreSQL access, and authorization.
- `src/middleware` and `src/config` provide request/security concerns and validated configuration.
- `db/migrations` and `db/seed.ts` manage PostgreSQL schema and development data.
- `tests` contains unit, integration, security, and end-to-end coverage.

Fastify, PostgreSQL (`pg`), Zod, Argon2, and Fastify's cookie, CORS, rate-limit, and Swagger plugins make up the runtime stack.

## Getting started

Requires Node.js 18+ and PostgreSQL 16+. Docker can start the database defined in `docker-compose.yml`.

```bash
cd 12_Latch
npm install
cp .env.example .env
docker compose up -d postgres
npm run migrate
npm run seed
npm run dev
```

The default server address is `http://localhost:3000`. Confirm it with the health route, then use the OpenAPI/Swagger UI route registered by the application.

## Environment

Use `.env.example` as the complete reference. At minimum configure:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/latch_dev
TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/latch_test
SESSION_SECRET=replace-with-a-random-secret-of-at-least-32-characters
CORS_ORIGIN=http://localhost:3000
```

`PORT`, pool settings, cookie security, and rate-limit settings are also supported. Do not use the development secret from the example file in a deployed environment.

## Commands

```bash
npm run dev              # watch-mode API
npm run build && npm start
npm run migrate          # apply migrations
npm run migrate:status
npm run migrate:down
npm run seed
npm test
npm run test:coverage
npm run typecheck
```
