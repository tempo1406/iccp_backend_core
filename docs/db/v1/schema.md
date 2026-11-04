# Project Schema v1 (Current)

## Scope
- Source of truth: current entities under `src/modules/project/**/entities/*.entity.ts`
- Snapshot date: 2026-03-10
- Principle: no foreign key constraints in project schema; validate in service layer.

## Enums
- `project.projects.status`: `planning | active | on_hold | completed | cancelled`
- `project.projects.priority`: `low | medium | high | critical`
- `project.project_members.role_id`: `uuid` (tham chiếu role cho RBAC project scope)
- `project.project_invites.role`: `pm | member`
- `project.project_invites.status`: `pending | accepted | rejected | canceled`
- `project.tasks.priority`: `low | medium | high | urgent`
- `project.task_histories.action`:
  `create | status_change | description_change | comment_add | tag_add | tag_remove | attachment_add | attachment_remove`
- `project.task_comments.author_role`: `manager | assignee`

## Tables

### 1) `project.projects`
- Columns:
  - `id` (uuid, PK)
  - `organization_id` (uuid)
  - `name` (varchar 255)
  - `description` (text, nullable)
  - `code` (varchar 50, nullable)
  - `project_key` (varchar 20, nullable)
  - `status` (enum, default `planning`)
  - `priority` (enum, default `medium`)
  - `start_date` (date, nullable)
  - `end_date` (date, nullable)
  - `manager_id` (uuid, nullable)
  - `created_by` (uuid)
  - `budget` (decimal 15,2, nullable)
  - `progress` (int, default `0`)
  - `is_active` (boolean, default `true`)
  - `created_at`, `updated_at`
  - `deleted_at`, `deleted_by` (soft delete)
- Indexes:
  - `IDX_project_projects_key(project_key)`

### 2) `project.project_members`
- Columns:
  - `id` (uuid, PK)
  - `project_id` (uuid)
  - `organization_id` (uuid)
  - `user_id` (uuid)
  - `role` (enum `owner|pm|member`, default `member`)
  - `role_id` (uuid, nullable) - map to project role in RBAC scope
  - `is_active` (boolean, default `true`)
  - `joined_at`, `created_at`, `updated_at`
  - `deleted_at`, `deleted_by` (soft delete)
- Constraints:
  - unique `(project_id, user_id)`

### 3) `project.project_invites`
- Columns:
  - `id` (uuid, PK)
  - `project_id` (uuid)
  - `organization_id` (uuid)
  - `invitee_user_id` (uuid)
  - `inviter_user_id` (uuid)
  - `role` (enum `pm|member`, default `pm`)
  - `status` (enum `pending|accepted|rejected|canceled`, default `pending`)
  - `token` (varchar 255, unique, nullable)
  - `expires_at` (timestamp, nullable)
  - `accepted_at` (timestamp, nullable)
  - `created_at`, `updated_at`
  - `deleted_at`, `deleted_by` (soft delete)

### 4) `project.status_tasks`
- Columns:
  - `id` (uuid, PK)
  - `project_id` (uuid)
  - `organization_id` (uuid)
  - `name` (varchar 120)
  - `order_index` (int)
  - `is_default` (boolean, default `false`)
  - `created_at`, `updated_at`
  - `deleted_at`, `deleted_by` (soft delete)

### 5) `project.tasks`
- Columns:
  - `id` (uuid, PK)
  - `project_id` (uuid)
  - `organization_id` (uuid)
  - `title` (varchar 500)
  - `slug` (varchar 80, nullable)
  - `parent_task_id` (uuid, nullable)
  - `description` (text, nullable)
  - `status_id` (uuid, nullable)
  - `priority` (enum `low|medium|high|urgent`, default `medium`)
  - `assigned_to` (uuid, nullable)
  - `created_by` (uuid)
  - `due_date`, `started_at`, `completed_at` (timestamp, nullable)
  - `created_at`, `updated_at`
  - `deleted_at`, `deleted_by` (soft delete)
- Indexes:
  - unique `IDX_project_tasks_slug(slug)`
- Note:
  - Legacy enum column `tasks.status` is no longer source of truth.
  - Source of truth for task status is `status_id -> project.status_tasks.id`.

### 6) `project.task_slug_counters`
- Columns:
  - `id` (uuid, PK)
  - `project_id` (uuid)
  - `organization_id` (uuid)
  - `next_value` (int, default `1`)
  - `created_at`, `updated_at`
- Constraints:
  - unique `(project_id)`

### 7) `project.task_comments`
- Columns:
  - `id` (uuid, PK)
  - `task_id` (uuid)
  - `project_id` (uuid)
  - `organization_id` (uuid)
  - `parent_comment_id` (uuid, nullable) - reply thread
  - `author_id` (uuid)
  - `author_role` (enum `manager|assignee`)
  - `content` (text)
  - `created_at`

### 8) `project.task_comment_mentions`
- Columns:
  - `id` (uuid, PK)
  - `comment_id` (uuid)
  - `task_id` (uuid)
  - `project_id` (uuid)
  - `organization_id` (uuid)
  - `mentioned_user_id` (uuid)
  - `created_at`
- Constraints:
  - unique `(comment_id, mentioned_user_id)`

### 9) `project.task_comment_reactions`
- Columns:
  - `id` (uuid, PK)
  - `comment_id` (uuid)
  - `task_id` (uuid)
  - `project_id` (uuid)
  - `organization_id` (uuid)
  - `user_id` (uuid)
  - `reaction` (varchar 64)
  - `created_at`
- Constraints:
  - unique `(comment_id, user_id, reaction)`

### 10) `project.task_tags`
- Columns:
  - `id` (uuid, PK)
  - `task_id` (uuid)
  - `project_id` (uuid)
  - `organization_id` (uuid)
  - `name` (varchar 50)
  - `normalized_name` (varchar 50)
  - `created_by` (uuid)
  - `created_at`
- Constraints:
  - unique `(task_id, normalized_name)`

### 11) `project.task_attachments`
- Columns:
  - `id` (uuid, PK)
  - `task_id` (uuid)
  - `project_id` (uuid)
  - `organization_id` (uuid)
  - `file_name` (varchar 255)
  - `file_url` (text) - local storage path or web link
  - `mime_type` (varchar 150, nullable)
  - `file_size` (int, nullable)
  - `uploaded_by` (uuid)
  - `created_at`

### 12) `project.task_histories`
- Columns:
  - `id` (uuid, PK)
  - `task_id` (uuid)
  - `project_id` (uuid)
  - `organization_id` (uuid)
  - `action` (enum)
  - `from_value` (text, nullable)
  - `to_value` (text, nullable)
  - `metadata` (jsonb, nullable)
  - `actor_id` (uuid)
  - `actor_display_name` (varchar 255)
  - `created_at`

## Soft Delete Coverage
- Soft delete enabled:
  - `project.projects`
  - `project.project_members`
  - `project.project_invites`
  - `project.status_tasks`
  - `project.tasks`
- No soft delete:
  - `task_comments`, `task_comment_mentions`, `task_comment_reactions`,
    `task_tags`, `task_attachments`, `task_histories`, `task_slug_counters`

## Migration Status Note
- `src/database/migrations/tables` is currently empty in this branch.
- If running with `postgres.synchronize=true`, schema follows entities automatically.
- For production/release, generate explicit table migrations from this schema snapshot.
