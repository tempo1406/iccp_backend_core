/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupToLegacyMessageMentionEnum1776595000000
  implements MigrationInterface
{
  name = 'AddGroupToLegacyMessageMentionEnum1776595000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'chat_mention_type_enum'
            AND n.nspname = 'chat'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          JOIN pg_enum e ON e.enumtypid = t.oid
          WHERE t.typname = 'chat_mention_type_enum'
            AND n.nspname = 'chat'
            AND e.enumlabel = 'group'
        ) THEN
          ALTER TYPE "chat"."chat_mention_type_enum"
          ADD VALUE 'group';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'message_mentions_mention_type_enum'
            AND n.nspname = 'chat'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          JOIN pg_enum e ON e.enumtypid = t.oid
          WHERE t.typname = 'message_mentions_mention_type_enum'
            AND n.nspname = 'chat'
            AND e.enumlabel = 'group'
        ) THEN
          ALTER TYPE "chat"."message_mentions_mention_type_enum"
          ADD VALUE 'group';
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing a single enum value safely.
    // No-op on rollback.
  }
}

*/