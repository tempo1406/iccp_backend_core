/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManualUnreadStateToChatReadStates1776600000000
  implements MigrationInterface
{
  name = 'AddManualUnreadStateToChatReadStates1776600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"."read_states"
      ADD COLUMN IF NOT EXISTS "is_manual_unread_by_user" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."read_states"
      ADD COLUMN IF NOT EXISTS "manual_unread_at" TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."read_states"
      ADD COLUMN IF NOT EXISTS "manual_unread_from_message_id" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"."read_states"
      DROP COLUMN IF EXISTS "manual_unread_from_message_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."read_states"
      DROP COLUMN IF EXISTS "manual_unread_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."read_states"
      DROP COLUMN IF EXISTS "is_manual_unread_by_user"
    `);
  }
}

*/