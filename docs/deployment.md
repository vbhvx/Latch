# Deployment & Operations

## Container

The `Dockerfile` is multi-stage (build → runtime), runs as the unprivileged `node` user under `tini`, contains
production dependencies only, and ships a `HEALTHCHECK` against `/health/liveness`.

```bash
export SESSION_SECRET=$(openssl rand -hex 32)
docker compose up --build      # postgres → migrate (one-shot, admin role) → api (restricted role)
```

## Two database roles (why it matters)

| Role          | Used by            | Privileges                                               |
| ------------- | ------------------ | -------------------------------------------------------- |
| `latch_admin` | `migrate` job only | owns schema, runs DDL                                    |
| `latch_app`   | the API            | `SELECT/INSERT/UPDATE/DELETE`, `NOSUPERUSER NOBYPASSRLS` |

PostgreSQL superusers bypass row-level security. Running the API as a restricted role is what makes the RLS
policies in `003_row_level_security.sql` a real enforcement layer instead of documentation.

## Production configuration guards

With `NODE_ENV=production` the process **refuses to boot** if `COOKIE_SECURE` is not `true`, `CORS_ORIGIN` is `*`,
`SESSION_SECRET` is a placeholder, or the pool bounds are inverted (see `src/config/env.ts`, covered by
`tests/unit/env.test.ts`).

## Behind a load balancer

Set `TRUST_PROXY_HOPS` to the number of proxies in front of the app (usually `1`). Without it, every client shares
the proxy's IP and rate limiting punishes everyone at once; with too high a value, clients can spoof
`X-Forwarded-For`.

## Observability

| Signal               | Where                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Liveness / readiness | `GET /health/liveness`, `GET /health/readiness` (readiness checks PostgreSQL)                                                                                                                                 |
| Metrics              | `GET /metrics` (Prometheus; latency histogram by _route template_, Node runtime metrics, `latch_sessions_purged_total`). Protect with `METRICS_TOKEN`.                                                        |
| Logs                 | Structured JSON (pino); `authorization`, `cookie`, and password fields are redacted; every line carries a `reqId` that is also returned as `requestId` in error bodies and honours an inbound `X-Request-Id`. |

## Lifecycle

- `SIGTERM`/`SIGINT` → stop accepting connections, drain in-flight requests, close the pool; a hard timeout
  (`SHUTDOWN_TIMEOUT_MS`) guarantees exit.
- Expired sessions are purged hourly (`SESSION_CLEANUP_INTERVAL_MINUTES`, `0` disables).
- Run migrations as a separate release step (`npm run migrate:prod`), not on app start, so multiple replicas
  never race.
