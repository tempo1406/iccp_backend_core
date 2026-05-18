// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: RemoveOrgAiTokenLimit1766000000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class RemoveOrgAiTokenLimit1766000000000 implements MigrationInterface {
// // // // // //   name = 'RemoveOrgAiTokenLimit1766000000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."org_settings"
// // // // // //       DROP COLUMN IF EXISTS "ai_token_limit"
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."org_settings"
// // // // // //       ADD COLUMN IF NOT EXISTS "ai_token_limit" INTEGER NOT NULL DEFAULT 10000000
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 