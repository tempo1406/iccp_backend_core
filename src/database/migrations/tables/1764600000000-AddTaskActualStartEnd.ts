// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddTaskActualStartEnd1764600000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddTaskActualStartEnd1764600000000 implements MigrationInterface {
// // // // // //   name = 'AddTaskActualStartEnd1764600000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "project"."tasks"
// // // // // //         ADD COLUMN IF NOT EXISTS "actual_start" TIMESTAMPTZ,
// // // // // //         ADD COLUMN IF NOT EXISTS "actual_end"   TIMESTAMPTZ
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "project"."tasks"
// // // // // //         DROP COLUMN IF EXISTS "actual_end",
// // // // // //         DROP COLUMN IF EXISTS "actual_start"
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 