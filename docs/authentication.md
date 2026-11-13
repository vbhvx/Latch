# Authentication & Session Management

## 1. Overview

Latch implements a durable, stateful, server-managed session authentication architecture backed by PostgreSQL. It avoids the revocation, key-rotation, and state-desynchronization pitfalls of stateless JWTs while ensuring that stolen database dumps cannot be used to forge active sessions.

---

## 2. Password Hashing (Argon2id)

Passwords are never stored in plaintext. They are hashed using **Argon2id** (RFC 9106), the winner of the Password Hashing Competition.

### Argon2id Configuration (`src/lib/crypto.ts`)

- **Algorithm Type:** `argon2id` (hybrid of Argon2d and Argon2i, providing defense against both GPU side-channel attacks and cache-timing attacks).
- **Memory Cost (`m`):** `65536 KB` (64 MB).
- **Time Cost (`t`):** `3 iterations`.
- **Parallelism (`p`):** `1 thread`.

### Account Enumeration Protection

During login attempts for non-existent email addresses, Latch executes a constant-time Argon2 verification against a precomputed dummy hash:

```typescript
const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ1Njc4OTAxMg$9wXp3J5iK8+8JvUq9mYw4A";
```

This ensures the response latency is identical whether an account exists or not, defeating timing-based account enumeration attacks.

---

## 3. Server-Managed Session Architecture

### 3.1 Token Generation & Storage

1. When a user registers or logs in, the server generates a cryptographically secure 256-bit random token using `crypto.randomBytes(32).toString('hex')`.
2. The server computes a SHA-256 digest of this token:
   $$\text{token\_hash} = \text{SHA-256}(\text{raw\_token})$$
3. Only the `token_hash` is stored in the `sessions` PostgreSQL table along with `user_id`, `expires_at`, `created_at`, `last_seen_at`, and `revoked_at`.
4. The client receives the raw token in either:
   - An `HttpOnly`, `SameSite=Lax`, `Secure` cookie named `latch_session`.
   - The JSON response body (`sessionToken`), allowing API clients to authenticate via `Authorization: Bearer <token>`.

### 3.2 Dual-Mode Token Extraction (`src/middleware/authenticate.ts`)

The `authenticate` middleware inspects the request in the following priority order:

1. `Authorization: Bearer <token>` HTTP header.
2. `latch_session` cookie.

### 3.3 Session Validation Rules

A session is recognized as valid if and only if all of the following conditions are met:

- A session record exists matching $\text{SHA-256}(\text{token})$.
- `revoked_at IS NULL`.
- `expires_at > NOW()`.
- The associated `user` record exists and has `status = 'active'`.

If the user account is `suspended` or `deactivated`, authentication fails with `403 Forbidden`.

### 3.4 Activity Tracking & Session Lifecycle

- Upon every authenticated request, `last_seen_at` is updated asynchronously in the background.
- Upon logout (`POST /api/v1/auth/logout`), the session's `revoked_at` column is set to `NOW()`, and the `latch_session` cookie is cleared.
- Expired sessions can be cleaned up using `sessionRepository.deleteExpiredSessions(pool)`.

---

## 4. Cookie Configuration

| Directive  | Development / Test | Production   | Security Justification                                                       |
| ---------- | ------------------ | ------------ | ---------------------------------------------------------------------------- |
| `HttpOnly` | `true`             | `true`       | Prevents client-side scripts from accessing session tokens (XSS mitigation). |
| `SameSite` | `Lax`              | `Lax`        | Mitigates CSRF on state-changing requests originating from external origins. |
| `Secure`   | `false`            | `true`       | Ensures cookies are transmitted only over encrypted TLS (HTTPS) connections. |
| `Path`     | `/`                | `/`          | Scopes cookie to the entire API domain.                                      |
| `Max-Age`  | `86400` (24h)      | Configurable | Automatically expires stale cookies in the browser.                          |

---

## 5. Security Invariants

- **No Plaintext Passwords:** Plaintext passwords only exist in ephemeral memory during registration/login and are never logged or stored.
- **No Password Hashes in API Responses:** Password hashes are strictly omitted from domain entities and API JSON representations.
- **No Raw Session Tokens in Database:** If the database is compromised, the attacker only acquires SHA-256 hashes of session tokens, which cannot be converted back into usable bearer tokens.
