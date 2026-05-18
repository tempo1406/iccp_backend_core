/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatRoomInvitationMemberRoleColumn1773982800000
  implements MigrationInterface
{
  name = 'AddChatRoomInvitationMemberRoleColumn1773982800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'chat' AND t.typname = 'chat_member_role_enum'
        ) THEN
          CREATE TYPE "chat"."chat_member_role_enum" AS ENUM('owner', 'admin', 'member', 'guest');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"."room_invitations"
      ADD COLUMN IF NOT EXISTS "member_role" "chat"."chat_member_role_enum" NOT NULL DEFAULT 'member'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"."room_invitations"
      DROP COLUMN IF EXISTS "member_role"
    `);
  }
}

*/