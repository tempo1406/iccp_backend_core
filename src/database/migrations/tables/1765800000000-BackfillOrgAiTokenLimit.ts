// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: BackfillOrgAiTokenLimit1765800000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class BackfillOrgAiTokenLimit1765800000000 implements MigrationInterface {
// // // // // //   name = 'BackfillOrgAiTokenLimit1765800000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."org_settings"
// // // // // //       ALTER COLUMN "ai_token_limit" SET DEFAULT 10000000
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       UPDATE "tenant"."org_settings"
// // // // // //       SET "ai_token_limit" = 10000000
// // // // // //       WHERE "ai_token_limit" = 100000
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."org_settings"
// // // // // //       ALTER COLUMN "ai_token_limit" SET DEFAULT 100000
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 