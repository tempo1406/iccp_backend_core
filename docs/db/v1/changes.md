# DB Changes v1 (Updated)

## Scope
- Module: `project` (core, project-member, task-management, status-task, role-manage integration)
- Baseline: old docs that only covered invite/status/slug/subtask
- Source of truth: entity model currently in repository

## Summary of Newly Reflected Changes
1. Invite flow now supports both PM and MEMBER role, with token-based acceptance.
2. Task domain expanded with comment reply, mention, reaction, tag, attachment, history.
3. Task status source-of-truth moved to `tasks.status_id` (status table driven).
4. Task priority enum changed to include `urgent`.
5. Project member model now includes organization scope and role binding (`role_id`).

## Added Tables

### `project.project_invites`
- Existing in previous note, now updated with full columns:
  - Added/confirmed: `token`, `expires_at`, `accepted_at`
  - `role` enum: `pm | member`
  - `status` enum: `pending | accepted | rejected | canceled`
- Purpose:
  - Email token invite and accept flow for PM/member.

### `project.status_tasks`
- Project-level customizable statuses with `order_index` and `is_default`.

### `project.task_slug_counters`
- Per-project monotonic counter to generate unique task slug.

### `project.task_comments`
- Adds threaded comments via `parent_comment_id`.
- Stores `author_role` (`manager|assignee`) and content.

### `project.task_comment_mentions`
- Mention targets by `mentioned_user_id`.
- Unique `(comment_id, mentioned_user_id)`.

### `project.task_comment_reactions`
- Reactions per user/comment.
- Unique `(comment_id, user_id, reaction)`.

### `project.task_tags`
- Normalized tags for dedupe.
- Unique `(task_id, normalized_name)`.

### `project.task_attachments`
- Attachment list per task.
- `file_url` stores either local attachment path or web link.

### `project.task_histories`
- Timeline/audit rows for key task changes.
- Supports `from_value`, `to_value`, `metadata`.

## Altered Tables

### `project.projects`
- Added/confirmed:
  - `project_key`
  - `deleted_at`, `deleted_by` (soft delete)

### `project.project_members`
- Added/confirmed:
  - `organization_id`
  - `role` (`owner|pm|member`)
  - `role_id` (bind to project role in RBAC scope)
  - `joined_at`, `created_at`, `updated_at`
  - `deleted_at`, `deleted_by`

### `project.tasks`
- Added/confirmed:
  - `slug` (unique index)
  - `parent_task_id`
  - `status_id`
  - `deleted_at`, `deleted_by`
- Removed from active design:
  - legacy `status` enum column is no longer source-of-truth
- Enum update:
  - priority now: `low | medium | high | urgent`

## Application-Level Behavior Changes
- Project create:
  - creator auto-member with `owner`
  - manager auto-member with `pm` (if different from creator)
  - can invite PM list during create/update
- Invite:
  - create invite for PM/member
  - accept by token (`project_invites.token`)
  - reject/cancel supported
- Task:
  - validate `statusId` belongs to same project and active
  - validate `parentTaskId` belongs to same project
  - cycle prevention in parent task updates
  - duplicate task flow uses slug counter
- Status delete:
  - cannot delete last active status
  - can move tasks to target status (`move_to_status_id`)

## Breaking/Compatibility Notes
- Clients should rely on `statusId` for task status, not legacy status enum.
- Any integration expecting only PM invite must now handle invite role `member`.
- Task priority value `critical` is replaced by `urgent` for task domain.
- Project APIs continue soft-delete semantics for core entities.

## Rollout Notes
- In this branch, `src/database/migrations/tables` is currently empty.
- If running with synchronize mode, DB follows entities automatically.
- For production:
  1. Generate and review table migrations from current entity snapshot.
  2. Apply migrations in target environments.
  3. Sync permissions (including `projects.statuses.*` and related project scopes).
