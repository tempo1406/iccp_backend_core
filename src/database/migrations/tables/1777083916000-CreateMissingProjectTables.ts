/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMissingProjectTables1777083916000
  implements MigrationInterface
{
  name = 'CreateMissingProjectTables1777083916000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Enums (safe create) ---
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'project' AND t.typname = 'project_invites_role_enum') THEN
          CREATE TYPE "project"."project_invites_role_enum" AS ENUM('pm', 'member');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'project' AND t.typname = 'project_invites_status_enum') THEN
          CREATE TYPE "project"."project_invites_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'canceled');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'project' AND t.typname = 'task_comments_author_role_enum') THEN
          CREATE TYPE "project"."task_comments_author_role_enum" AS ENUM('manager', 'assignee');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'project' AND t.typname = 'task_histories_action_enum') THEN
          CREATE TYPE "project"."task_histories_action_enum" AS ENUM('create', 'status_change', 'description_change', 'comment_add', 'tag_add', 'tag_remove', 'attachment_add', 'attachment_remove');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'project' AND t.typname = 'task_worklogs_source_enum') THEN
          CREATE TYPE "project"."task_worklogs_source_enum" AS ENUM('manual', 'timer', 'daily_report');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'project' AND t.typname = 'daily_reports_status_enum') THEN
          CREATE TYPE "project"."daily_reports_status_enum" AS ENUM('draft', 'submitted', 'locked');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'project' AND t.typname = 'daily_report_items_type_enum') THEN
          CREATE TYPE "project"."daily_report_items_type_enum" AS ENUM('worklog', 'manual');
        END IF;
      END $$;
    `);

    // --- Tables ---

    // project_invites
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."project_invites" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "invitee_user_id" UUID NOT NULL,
        "inviter_user_id" UUID NOT NULL,
        "role" "project"."project_invites_role_enum" NOT NULL DEFAULT 'pm',
        "status" "project"."project_invites_status_enum" NOT NULL DEFAULT 'pending',
        "token" VARCHAR(255) NULL UNIQUE,
        "expires_at" TIMESTAMPTZ NULL,
        "accepted_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        "deleted_by" UUID NULL
      )
    `);

    // status_tasks
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."status_tasks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "name" VARCHAR(120) NOT NULL,
        "order_index" INT NOT NULL,
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        "deleted_by" UUID NULL
      )
    `);

    // task_comments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."task_comments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "task_id" UUID NOT NULL,
        "project_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "parent_comment_id" UUID NULL,
        "author_id" UUID NOT NULL,
        "author_role" "project"."task_comments_author_role_enum" NOT NULL,
        "content" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        "deleted_by" UUID NULL
      )
    `);

    // task_comment_reactions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."task_comment_reactions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "comment_id" UUID NOT NULL,
        "task_id" UUID NOT NULL,
        "project_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "reaction" VARCHAR(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE ("comment_id", "user_id", "reaction")
      )
    `);

    // task_comment_mentions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."task_comment_mentions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "comment_id" UUID NOT NULL,
        "task_id" UUID NOT NULL,
        "project_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "mentioned_user_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE ("comment_id", "mentioned_user_id")
      )
    `);

    // task_attachments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."task_attachments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "task_id" UUID NOT NULL,
        "project_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "file_name" VARCHAR(255) NOT NULL,
        "file_url" TEXT NOT NULL,
        "mime_type" VARCHAR(150) NULL,
        "file_size" INT NULL,
        "uploaded_by" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // task_tags
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."task_tags" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "task_id" UUID NOT NULL,
        "project_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "name" VARCHAR(50) NOT NULL,
        "normalized_name" VARCHAR(50) NOT NULL,
        "created_by" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE ("task_id", "normalized_name")
      )
    `);

    // task_histories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."task_histories" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "task_id" UUID NOT NULL,
        "project_id" UUID NOT NULL,
        "organization_id" UUID NOT NULL,
        "action" "project"."task_histories_action_enum" NOT NULL,
        "from_value" TEXT NULL,
        "to_value" TEXT NULL,
        "metadata" JSONB NULL,
        "actor_id" UUID NOT NULL,
        "actor_display_name" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // task_slug_counters
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."task_slug_counters" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" UUID NOT NULL UNIQUE,
        "organization_id" UUID NOT NULL,
        "next_value" INT NOT NULL DEFAULT 1,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // task_worklogs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."task_worklogs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" UUID NOT NULL,
        "project_id" UUID NOT NULL,
        "task_id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "work_date" DATE NOT NULL,
        "started_at" TIMESTAMPTZ NULL,
        "ended_at" TIMESTAMPTZ NULL,
        "duration_minutes" INT NOT NULL,
        "description" TEXT NULL,
        "progress_percent" INT NULL,
        "is_blocker" BOOLEAN NOT NULL DEFAULT false,
        "source" VARCHAR(20) NOT NULL DEFAULT 'manual',
        "reported_daily_report_id" UUID NULL,
        "is_submitted" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      )
    `);

    // daily_reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."daily_reports" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" UUID NOT NULL,
        "project_id" UUID NULL,
        "user_id" UUID NOT NULL,
        "report_date" DATE NOT NULL,
        "status" "project"."daily_reports_status_enum" NOT NULL DEFAULT 'draft',
        "summary" TEXT NULL,
        "blockers" TEXT NULL,
        "plan_tomorrow" TEXT NULL,
        "total_logged_minutes" INT NOT NULL DEFAULT 0,
        "submitted_at" TIMESTAMPTZ NULL,
        "seen_by" UUID NULL,
        "seen_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE ("organization_id", "project_id", "user_id", "report_date")
      )
    `);

    // daily_report_comments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."daily_report_comments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "daily_report_id" UUID NOT NULL,
        "author_id" UUID NOT NULL,
        "content" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // daily_report_items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project"."daily_report_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "daily_report_id" UUID NOT NULL,
        "type" "project"."daily_report_items_type_enum" NOT NULL DEFAULT 'worklog',
        "worklog_id" UUID NULL,
        "project_id" UUID NULL,
        "task_id" UUID NULL,
        "project_name_snapshot" VARCHAR(255) NULL,
        "task_title_snapshot" VARCHAR(500) NULL,
        "task_slug_snapshot" VARCHAR(80) NULL,
        "content" TEXT NULL,
        "work_date" DATE NOT NULL,
        "started_at" TIMESTAMPTZ NULL,
        "ended_at" TIMESTAMPTZ NULL,
        "duration_minutes" INT NOT NULL DEFAULT 0,
        "progress_percent" INT NULL,
        "is_blocker" BOOLEAN NOT NULL DEFAULT false,
        "display_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // --- Indexes ---
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_task_worklogs_task_work_date" ON "project"."task_worklogs"("task_id", "work_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_task_worklogs_org_user_work_date" ON "project"."task_worklogs"("organization_id", "user_id", "work_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_daily_reports_org_project_date" ON "project"."daily_reports"("organization_id", "project_id", "report_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_daily_report_comments_report" ON "project"."daily_report_comments"("daily_report_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_daily_report_items_report" ON "project"."daily_report_items"("daily_report_id", "display_order")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."daily_report_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."daily_report_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."daily_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."task_worklogs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."task_slug_counters"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."task_histories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."task_tags"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."task_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."task_comment_mentions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."task_comment_reactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."task_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."status_tasks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project"."project_invites"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "project"."daily_report_items_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project"."daily_reports_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project"."task_worklogs_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project"."task_histories_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project"."task_comments_author_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project"."project_invites_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project"."project_invites_role_enum"`);
  }
}

*/