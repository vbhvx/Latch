# Authorization Matrix & Role-Based Access Control (RBAC)

## 1. Overview

Latch employs explicit, centralized authorization policies coupled with resource-scoped SQL queries. Authorization decisions consider:

1. **Authenticated Identity:** Who is performing the action (`request.user`).
2. **Contextual Scope:** The target workspace membership and role (`owner`, `member`, `viewer`).
3. **Resource Ownership:** Direct ownership of a resource (e.g. `task.owner_id === user.id`).
4. **Resource State:** E.g., whether the resource is active or soft-deleted (`deleted_at IS NULL`).

---

## 2. Workspace Roles Definition

| Role         | Definition & Authority Scope                                                                                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**    | Administrative authority over the workspace. Can update workspace settings, invite/remove members, modify roles, view audit logs, delete workspace, and manage/delete all tasks in the workspace.                          |
| **Member**   | Active collaborator. Can read all tasks in the workspace, create tasks, update existing tasks, and delete tasks they personally created. Cannot manage members, view audit logs, or delete tasks created by other members. |
| **Viewer**   | Read-only participant. Can list and inspect workspace details, members, and tasks. Cannot create, update, or delete tasks, and cannot manage memberships.                                                                  |
| **Outsider** | Authenticated user who does not belong to the workspace. Has no access. Any attempt to inspect or modify resources returns `404 Not Found` to prevent resource existence enumeration.                                      |

---

## 3. Operations Permission Matrix

| Resource       | Operation           | Endpoint                                     |  Owner   | Member  | Viewer  |         Outsider          |      Negative Response Code       |
| -------------- | ------------------- | -------------------------------------------- | :------: | :-----: | :-----: | :-----------------------: | :-------------------------------: |
| **Workspace**  | List Accessible     | `GET /api/v1/workspaces`                     | Allowed  | Allowed | Allowed | N/A (own workspaces only) |                N/A                |
| **Workspace**  | Create              | `POST /api/v1/workspaces`                    | Allowed  | Allowed | Allowed |          Allowed          |                N/A                |
| **Workspace**  | View Detail         | `GET /api/v1/workspaces/:id`                 | Allowed  | Allowed | Allowed |          Denied           |          `404 Not Found`          |
| **Workspace**  | Update Settings     | `PATCH /api/v1/workspaces/:id`               | Allowed  | Denied  | Denied  |          Denied           | `403 Forbidden` / `404 Not Found` |
| **Workspace**  | Delete Workspace    | `DELETE /api/v1/workspaces/:id`              | Allowed  | Denied  | Denied  |          Denied           | `403 Forbidden` / `404 Not Found` |
| **Members**    | List Members        | `GET /api/v1/workspaces/:id/members`         | Allowed  | Allowed | Allowed |          Denied           |          `404 Not Found`          |
| **Members**    | Add Member          | `POST /api/v1/workspaces/:id/members`        | Allowed  | Denied  | Denied  |          Denied           | `403 Forbidden` / `404 Not Found` |
| **Members**    | Update Role         | `PATCH /api/v1/workspaces/:id/members/:uid`  | Allowed* | Denied  | Denied  |          Denied           | `403 Forbidden` / `404 Not Found` |
| **Members**    | Remove Member       | `DELETE /api/v1/workspaces/:id/members/:uid` | Allowed* | Denied  | Denied  |          Denied           | `403 Forbidden` / `404 Not Found` |
| **Audit Logs** | View Audit Events   | `GET /api/v1/workspaces/:id/audit-events`    | Allowed  | Denied  | Denied  |          Denied           | `403 Forbidden` / `404 Not Found` |
| **Task**       | List Tasks          | `GET /api/v1/tasks?workspaceId=:id`          | Allowed  | Allowed | Allowed |          Denied           |          `404 Not Found`          |
| **Task**       | Create Task         | `POST /api/v1/tasks`                         | Allowed  | Allowed | Denied  |          Denied           | `403 Forbidden` / `404 Not Found` |
| **Task**       | View Task           | `GET /api/v1/tasks/:taskId`                  | Allowed  | Allowed | Allowed |          Denied           |          `404 Not Found`          |
| **Task**       | Update Task         | `PATCH /api/v1/tasks/:taskId`                | Allowed  | Allowed | Denied  |          Denied           | `403 Forbidden` / `404 Not Found` |
| **Task**       | Delete Own Task     | `DELETE /api/v1/tasks/:taskId`               | Allowed  | Allowed | Denied  |          Denied           | `403 Forbidden` / `404 Not Found` |
| **Task**       | Delete Other's Task | `DELETE /api/v1/tasks/:taskId`               | Allowed  | Denied  | Denied  |          Denied           | `403 Forbidden` / `404 Not Found` |

_\* Note: An Owner cannot be demoted or removed if they are the sole remaining owner of the workspace (enforced with `409 Conflict`)._

---

## 4. Privilege Escalation Safeguards

1. **Strict Input Schemas:** The `PATCH /api/v1/tasks/:taskId` endpoint schema only allows `title`, `description`, `status`, and `version`. Extra fields such as `role`, `owner_id`, or `workspace_id` are rejected immediately with `400 VALIDATION_ERROR`.
2. **Membership Role Mutations:** Member role modification is exclusively handled by `PATCH /api/v1/workspaces/:workspaceId/members/:userId`, which enforces that `request.user` is an Owner in that workspace.
3. **Sole Owner Invariant:** A workspace must always retain at least one Owner. If an owner attempts to demote or remove themselves when `countOwners <= 1`, the operation is aborted with a `409 Conflict`.
4. **Information Disclosure Prevention:** When an unauthorized identity attempts to access a workspace or task that exists but they have no membership for, the server responds with `404 Not Found` rather than `403 Forbidden` to prevent guessing resource IDs.
