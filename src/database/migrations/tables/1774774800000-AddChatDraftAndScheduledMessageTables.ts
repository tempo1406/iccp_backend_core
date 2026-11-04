/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatDraftAndScheduledMessageTables1774774800000
  implements MigrationInterface
{
  name = 'AddChatDraftAndScheduledMessageTables1774774800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'chat_message_draft_source_enum'
            AND n.nspname = 'chat'
        ) THEN
          CREATE TYPE "chat"."chat_message_draft_source_enum" AS ENUM (
            'composer_autosave',
            'cancelled_schedule',
            'manual_save'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'chat_scheduled_message_status_enum'
            AND n.nspname = 'chat'
        ) THEN
          CREATE TYPE "chat"."chat_scheduled_message_status_enum" AS ENUM (
            'pending',
            'processing',
            'sent',
            'cancelled',
            'converted_to_draft',
            'failed'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat"."message_drafts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "room_id" uuid NOT NULL,
        "author_user_id" uuid NOT NULL,
        "thread_root_message_id" uuid,
        "parent_message_id" uuid,
        "content" text,
        "rich_content" jsonb,
        "metadata" jsonb,
        "draft_source" "chat"."chat_message_draft_source_enum" NOT NULL DEFAULT 'composer_autosave',
        "last_composer_activity_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_message_drafts_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat"."scheduled_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "room_id" uuid NOT NULL,
        "author_user_id" uuid NOT NULL,
        "thread_root_message_id" uuid,
        "parent_message_id" uuid,
        "content" text,
        "rich_content" jsonb,
        "metadata" jsonb,
        "scheduled_for_utc" TIMESTAMP NOT NULL,
        "scheduled_timezone" character varying(100) NOT NULL,
        "scheduled_local_date" character varying(20) NOT NULL,
        "scheduled_local_time" character varying(20) NOT NULL,
        "status" "chat"."chat_scheduled_message_status_enum" NOT NULL DEFAULT 'pending',
        "source_draft_id" uuid,
        "sent_message_id" uuid,
        "last_error_code" character varying(120),
        "last_error_message" text,
        "sent_at" TIMESTAMP,
        "cancelled_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_scheduled_messages_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_drafts"
      ADD CONSTRAINT "FK_chat_message_drafts_organization"
      FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_drafts"
      ADD CONSTRAINT "FK_chat_message_drafts_room"
      FOREIGN KEY ("room_id") REFERENCES "chat"."rooms"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_drafts"
      ADD CONSTRAINT "FK_chat_message_drafts_author"
      FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_drafts"
      ADD CONSTRAINT "FK_chat_message_drafts_thread_root"
      FOREIGN KEY ("thread_root_message_id") REFERENCES "chat"."messages"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_drafts"
      ADD CONSTRAINT "FK_chat_message_drafts_parent"
      FOREIGN KEY ("parent_message_id") REFERENCES "chat"."messages"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      ADD CONSTRAINT "FK_chat_scheduled_messages_organization"
      FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      ADD CONSTRAINT "FK_chat_scheduled_messages_room"
      FOREIGN KEY ("room_id") REFERENCES "chat"."rooms"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      ADD CONSTRAINT "FK_chat_scheduled_messages_author"
      FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      ADD CONSTRAINT "FK_chat_scheduled_messages_thread_root"
      FOREIGN KEY ("thread_root_message_id") REFERENCES "chat"."messages"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      ADD CONSTRAINT "FK_chat_scheduled_messages_parent"
      FOREIGN KEY ("parent_message_id") REFERENCES "chat"."messages"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      ADD CONSTRAINT "FK_chat_scheduled_messages_source_draft"
      FOREIGN KEY ("source_draft_id") REFERENCES "chat"."message_drafts"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      ADD CONSTRAINT "FK_chat_scheduled_messages_sent_message"
      FOREIGN KEY ("sent_message_id") REFERENCES "chat"."messages"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_message_drafts_org_author_updated_at"
      ON "chat"."message_drafts" ("organization_id", "author_user_id", "updated_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_message_drafts_org_room_author_updated_at"
      ON "chat"."message_drafts" ("organization_id", "room_id", "author_user_id", "updated_at")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_message_drafts_author_context"
      ON "chat"."message_drafts" (
        "organization_id",
        "room_id",
        "author_user_id",
        COALESCE("thread_root_message_id", '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE("parent_message_id", '00000000-0000-0000-0000-000000000000'::uuid)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_scheduled_messages_status_scheduled_for_utc"
      ON "chat"."scheduled_messages" ("status", "scheduled_for_utc")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_scheduled_messages_author_status_scheduled_for_utc"
      ON "chat"."scheduled_messages" ("author_user_id", "status", "scheduled_for_utc")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_scheduled_messages_room_status_scheduled_for_utc"
      ON "chat"."scheduled_messages" ("room_id", "status", "scheduled_for_utc")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "chat"."IDX_chat_scheduled_messages_room_status_scheduled_for_utc"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "chat"."IDX_chat_scheduled_messages_author_status_scheduled_for_utc"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "chat"."IDX_chat_scheduled_messages_status_scheduled_for_utc"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "chat"."UQ_chat_message_drafts_author_context"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "chat"."IDX_chat_message_drafts_org_room_author_updated_at"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "chat"."IDX_chat_message_drafts_org_author_updated_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      DROP CONSTRAINT IF EXISTS "FK_chat_scheduled_messages_sent_message"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      DROP CONSTRAINT IF EXISTS "FK_chat_scheduled_messages_source_draft"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      DROP CONSTRAINT IF EXISTS "FK_chat_scheduled_messages_parent"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      DROP CONSTRAINT IF EXISTS "FK_chat_scheduled_messages_thread_root"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      DROP CONSTRAINT IF EXISTS "FK_chat_scheduled_messages_author"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      DROP CONSTRAINT IF EXISTS "FK_chat_scheduled_messages_room"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat"."scheduled_messages"
      DROP CONSTRAINT IF EXISTS "FK_chat_scheduled_messages_organization"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_drafts"
      DROP CONSTRAINT IF EXISTS "FK_chat_message_drafts_parent"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat"."message_drafts"
      DROP CONSTRAINT IF EXISTS "FK_chat_message_drafts_thread_root"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat"."message_drafts"
      DROP CONSTRAINT IF EXISTS "FK_chat_message_drafts_author"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat"."message_drafts"
      DROP CONSTRAINT IF EXISTS "FK_chat_message_drafts_room"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat"."message_drafts"
      DROP CONSTRAINT IF EXISTS "FK_chat_message_drafts_organization"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "chat"."scheduled_messages"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "chat"."message_drafts"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "chat"."chat_scheduled_message_status_enum"
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "chat"."chat_message_draft_source_enum"
    `);
  }
}

*/