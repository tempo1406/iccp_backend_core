// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddChatRoomPinPolicyColumns1773205200000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddChatRoomPinPolicyColumns1773205200000 implements MigrationInterface {
// // // // // //   name = 'AddChatRoomPinPolicyColumns1773205200000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."rooms"
// // // // // //       ADD COLUMN IF NOT EXISTS "allow_member_pin_messages" boolean NOT NULL DEFAULT false
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."rooms"
// // // // // //       ADD COLUMN IF NOT EXISTS "allow_guest_pin_messages" boolean NOT NULL DEFAULT false
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       UPDATE "chat"."rooms"
// // // // // //       SET "allow_member_pin_messages" = true
// // // // // //       WHERE "room_type" IN ('dm', 'group_dm')
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."rooms"
// // // // // //       DROP COLUMN IF EXISTS "allow_guest_pin_messages"
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "chat"."rooms"
// // // // // //       DROP COLUMN IF EXISTS "allow_member_pin_messages"
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 