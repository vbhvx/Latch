# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue. Use GitHub's private
[security advisory](https://github.com/vbhvx/Latch/security/advisories/new) form and include reproduction
steps and impact. Expect an acknowledgement within 72 hours.

## Design summary

The full analysis lives in [docs/threat-model.md](docs/threat-model.md). In short: Argon2id password hashing,
256-bit opaque session tokens stored only as SHA-256 digests, centralized RBAC policies, 100% parameterized SQL
with allow-listed dynamic identifiers, PostgreSQL row-level security as a second enforcement layer, strict Zod
validation, security headers (CSP, HSTS, nosniff), per-route rate limiting, and sanitized error envelopes.
