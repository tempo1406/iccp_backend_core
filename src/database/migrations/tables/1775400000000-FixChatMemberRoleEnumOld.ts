// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: FixChatMemberRoleEnumOld1775400000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class FixChatMemberRoleEnumOld1775400000000 implements MigrationInterface {
// // // // // //   name = 'FixChatMemberRoleEnumOld1775400000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     const [{ oldTypeExists }] = await queryRunner.query(`
// // // // // //       SELECT EXISTS (
// // // // // //         SELECT 1
// // // // // //         FROM pg_type t
// // // // // //         JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //         WHERE n.nspname = 'chat'
// // // // // //           AND t.typname = 'chat_member_role_enum_old'
// // // // // //       ) AS "oldTypeExists"
// // // // // //     `);
// // // // // // 
// // // // // //     if (!oldTypeExists) {
// // // // // //       return;
// // // // // //     }
// // // // // // 
// // // // // //     const [{ currentTypeExists }] = await queryRunner.query(`
// // // // // //       SELECT EXISTS (
// // // // // //         SELECT 1
// // // // // //         FROM pg_type t
// // // // // //         JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //         WHERE n.nspname = 'chat'
// // // // // //           AND t.typname = 'chat_member_role_enum'
// // // // // //       ) AS "currentTypeExists"
// // // // // //     `);
// // // // // // 
// // // // // //     // If synchronize left only the _old type, promote it back to canonical name.
// // // // // //     if (!currentTypeExists) {
// // // // // //       await queryRunner.query(`
// // // // // //         ALTER TYPE "chat"."chat_member_role_enum_old"
// // // // // //         RENAME TO "chat_member_role_enum"
// // // // // //       `);
// // // // // //       return;
// // // // // //     }
// // // // // // 
// // // // // //     // Move dependent columns off _old type so it can be safely dropped.
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF EXISTS (
// // // // // //           SELECT 1
// // // // // //           FROM information_schema.columns
// // // // // //           WHERE table_schema = 'chat'
// // // // // //             AND table_name = 'room_invitations'
// // // // // //             AND column_name = 'member_role'
// // // // // //             AND udt_name = 'chat_member_role_enum_old'
// // // // // //         ) THEN
// // // // // //           ALTER TABLE "chat"."room_invitations"
// // // // // //           ALTER COLUMN "member_role" TYPE "chat"."chat_member_role_enum"
// // // // // //           USING "member_role"::text::"chat"."chat_member_role_enum";
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF EXISTS (
// // // // // //           SELECT 1
// // // // // //           FROM information_schema.columns
// // // // // //           WHERE table_schema = 'chat'
// // // // // //             AND table_name = 'room_members'
// // // // // //             AND column_name = 'member_role'
// // // // // //             AND udt_name = 'chat_member_role_enum_old'
// // // // // //         ) THEN
// // // // // //           ALTER TABLE "chat"."room_members"
// // // // // //           ALTER COLUMN "member_role" TYPE "chat"."chat_member_role_enum"
// // // // // //           USING "member_role"::text::"chat"."chat_member_role_enum";
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DROP TYPE IF EXISTS "chat"."chat_member_role_enum_old"
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(): Promise<void> {
// // // // // //     // No-op: this migration heals a broken enum state from synchronize.
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 