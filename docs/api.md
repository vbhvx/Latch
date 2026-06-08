# REST API Specification (v1)

## 1. Conventions & Base URL

- **Base URL:** `/api/v1`
- **Interactive Documentation (Swagger UI):** `/docs`
- **OpenAPI Schema (JSON):** `/docs/json`
- **Request Format:** `application/json`
- **Response Format:** `application/json`
- **Correlation Header:** `x-request-id` (generated or propagated on every response)

---

## 2. Authentication

Requests requiring authentication accept either:
1. `Authorization: Bearer <session_token>` header.
2. `latch_session` cookie (automatically managed for browser clients).

Unauthenticated requests to protected endpoints return:
```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required. Please provide a valid session token.",
    "requestId": "req_84729103-..."
  }
}
```

---

## 3. Standard Error Envelope

All API errors follow the unified schema:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Invalid email address"
      }
    ],
    "requestId": "req_f827361a-..."
  }
}
```

### Common Error Codes
| HTTP Status | Error Code | Description |
|:---:|---|---|
| `400` | `VALIDATION_ERROR` | Schema validation failure, unrecognized payload key, or constraint violation. |
| `401` | `UNAUTHENTICATED` | Missing, expired, or invalid session token. |
| `403` | `FORBIDDEN` | Insufficient role permissions or deactivated user account. |
| `404` | `NOT_FOUND` | Resource does not exist or caller does not belong to the parent workspace. |
| `409` | `CONFLICT` | Optimistic locking version conflict, unique constraint collision, or sole owner invariant. |
| `429` | `RATE_LIMIT_EXCEEDED` | Request rate exceeded allowed quota. |
| `500` | `INTERNAL_SERVER_ERROR` | Unhandled internal server error (sanitized, internal details hidden). |

---

## 4. Endpoints Reference

### 4.1 Authentication & Profile

#### `POST /api/v1/auth/register`
Create a new user account, initialize personal workspace, and issue session.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "displayName": "Alex Doe",
    "password": "MinLength8Password!"
  }
  ```
- **Responses:**
  - `201 Created`: `{ "user": { ... }, "sessionToken": "...", "expiresAt": "..." }`
  - `400 Bad Request`: Validation failure.
  - `409 Conflict`: Email already registered.

#### `POST /api/v1/auth/login`
Authenticate with email and password.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "MinLength8Password!"
  }
  ```
- **Responses:**
  - `200 OK`: `{ "user": { ... }, "sessionToken": "...", "expiresAt": "..." }`
  - `401 Unauthorized`: Invalid credentials.
  - `403 Forbidden`: Account suspended/deactivated.

#### `POST /api/v1/auth/logout`
Revoke the current session token and clear cookies.
- **Responses:**
  - `200 OK`: `{ "message": "Logged out successfully" }`

#### `GET /api/v1/me`
Retrieve profile of authenticated user.
- **Responses:**
  - `200 OK`: `{ "user": { "id": "...", "email": "...", "display_name": "...", "status": "active" } }`

---

### 4.2 Workspaces

#### `GET /api/v1/workspaces`
List all workspaces accessible to the authenticated user along with their role (`owner`, `member`, `viewer`).

#### `POST /api/v1/workspaces`
Create a new shared workspace. The creator is assigned role `owner`.
- **Request Body:** `{ "name": "Engineering Team" }`
- **Responses:** `201 Created`

#### `GET /api/v1/workspaces/:workspaceId`
Retrieve details of a workspace. Returns `404` if caller is not a member.

#### `PATCH /api/v1/workspaces/:workspaceId`
Update workspace name. Restricted to `owner`.

#### `DELETE /api/v1/workspaces/:workspaceId`
Delete workspace and cascade delete all its tasks and memberships. Restricted to `owner`.

#### `GET /api/v1/workspaces/:workspaceId/members`
List all members in the workspace.

#### `POST /api/v1/workspaces/:workspaceId/members`
Add a user to the workspace. Restricted to `owner`.
- **Request Body:** `{ "email": "colleague@example.com", "role": "member" }`

#### `PATCH /api/v1/workspaces/:workspaceId/members/:userId`
Update a member's role (`owner`, `member`, `viewer`). Restricted to `owner`. Cannot demote sole owner.

#### `DELETE /api/v1/workspaces/:workspaceId/members/:userId`
Remove a member from the workspace. Restricted to `owner`. Cannot remove sole owner.

#### `GET /api/v1/workspaces/:workspaceId/audit-events`
List audit events for the workspace. Restricted to `owner`.

---

### 4.3 Tasks

#### `GET /api/v1/tasks`
List tasks accessible to the caller.
- **Query Parameters:**
  - `workspaceId` (optional UUID): Filter to specific workspace.
  - `status` (optional): `todo` | `in_progress` | `done`.
  - `search` (optional string): Case-insensitive search on title.
  - `sortBy` (optional): `createdAt` | `updatedAt` | `title` | `status` (default: `createdAt`).
  - `sortOrder` (optional): `asc` | `desc` (default: `desc`).
  - `limit` (optional integer): `1` to `100` (default: `20`).
  - `offset` (optional integer): default `0`.

#### `POST /api/v1/tasks`
Create a task within a workspace. Restricted to `owner` and `member`. Viewers receive `403`.
- **Request Body:**
  ```json
  {
    "workspaceId": "a1b2c3d4-...",
    "title": "Build integration tests",
    "description": "Cover negative cases",
    "status": "todo"
  }
  ```

#### `GET /api/v1/tasks/:taskId`
Retrieve task detail. Returns `404` if task is deleted or caller does not belong to the workspace.

#### `PATCH /api/v1/tasks/:taskId`
Update permitted fields with **Optimistic Concurrency Control**. Restricted to `owner` and `member`.
- **Request Body:**
  ```json
  {
    "title": "Updated Task Title",
    "status": "in_progress",
    "version": 1
  }
  ```
- **Responses:**
  - `200 OK`: Returns updated task with incremented `version: 2`.
  - `409 Conflict`: Task was modified by another request (`VERSION_CONFLICT`).

#### `DELETE /api/v1/tasks/:taskId`
Soft-delete task (`deleted_at = NOW()`).
- Allowed for: Workspace `owner` or task creator (`member`).
- Denied for: Viewers (`403`) or non-creator members (`403`).

