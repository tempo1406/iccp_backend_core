/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatMessageAttachmentPreviewColumns1774688400000
  implements MigrationInterface
{
  name = 'AddChatMessageAttachmentPreviewColumns1774688400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      ADD COLUMN IF NOT EXISTS "document_type" character varying(32)
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      ADD COLUMN IF NOT EXISTS "preview_status" character varying(20)
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      ADD COLUMN IF NOT EXISTS "preview_thumbnail_url" text
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      ADD COLUMN IF NOT EXISTS "preview_url" text
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      ADD COLUMN IF NOT EXISTS "preview_width" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      ADD COLUMN IF NOT EXISTS "preview_height" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      ADD COLUMN IF NOT EXISTS "preview_page" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      ADD COLUMN IF NOT EXISTS "page_count" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      ADD COLUMN IF NOT EXISTS "preview_error_code" character varying(120)
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      ADD COLUMN IF NOT EXISTS "preview_updated_at" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      DROP COLUMN IF EXISTS "preview_updated_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      DROP COLUMN IF EXISTS "preview_error_code"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      DROP COLUMN IF EXISTS "page_count"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      DROP COLUMN IF EXISTS "preview_page"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      DROP COLUMN IF EXISTS "preview_height"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      DROP COLUMN IF EXISTS "preview_width"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      DROP COLUMN IF EXISTS "preview_url"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      DROP COLUMN IF EXISTS "preview_thumbnail_url"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      DROP COLUMN IF EXISTS "preview_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."message_attachments"
      DROP COLUMN IF EXISTS "document_type"
    `);
  }
}

*/