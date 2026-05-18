// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddOrgAiTokenLimit1765700000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddOrgAiTokenLimit1765700000000 implements MigrationInterface {
// // // // // //   name = 'AddOrgAiTokenLimit1765700000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."org_settings"
// // // // // //       ADD COLUMN IF NOT EXISTS "ai_token_limit" INTEGER NOT NULL DEFAULT 10000000
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."org_settings"
// // // // // //       DROP COLUMN IF EXISTS "ai_token_limit"
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 