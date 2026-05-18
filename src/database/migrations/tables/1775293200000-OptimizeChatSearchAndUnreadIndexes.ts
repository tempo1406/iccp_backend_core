/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeChatSearchAndUnreadIndexes1775293200000
  implements MigrationInterface
{
  name = 'OptimizeChatSearchAndUnreadIndexes1775293200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_search_tsv_simple"
      ON "chat"."messages"
      USING GIN (to_tsvector('simple', COALESCE("content", '')))
      WHERE "is_deleted" = false
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_content_trgm"
      ON "chat"."messages"
      USING GIN ("content" gin_trgm_ops)
      WHERE "is_deleted" = false AND "content" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_room_not_deleted_sent_at"
      ON "chat"."messages" ("room_id", "sent_at")
      WHERE "is_deleted" = false
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_read_states_org_user_room_last_read_at"
      ON "chat"."read_states" ("organization_id", "user_id", "room_id", "last_read_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "chat"."IDX_chat_read_states_org_user_room_last_read_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "chat"."IDX_chat_messages_room_not_deleted_sent_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "chat"."IDX_chat_messages_content_trgm"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "chat"."IDX_chat_messages_search_tsv_simple"`,
    );
  }
}

*/