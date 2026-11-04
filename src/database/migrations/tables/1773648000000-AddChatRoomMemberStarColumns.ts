/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatRoomMemberStarColumns1773648000000
  implements MigrationInterface
{
  name = 'AddChatRoomMemberStarColumns1773648000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"."room_members"
      ADD COLUMN IF NOT EXISTS "is_starred" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."room_members"
      ADD COLUMN IF NOT EXISTS "starred_at" timestamp NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_room_members_org_user_star_active"
      ON "chat"."room_members" ("organization_id", "user_id", "is_starred", "is_active")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "chat"."IDX_chat_room_members_org_user_star_active"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."room_members"
      DROP COLUMN IF EXISTS "starred_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."room_members"
      DROP COLUMN IF EXISTS "is_starred"
    `);
  }
}


*/