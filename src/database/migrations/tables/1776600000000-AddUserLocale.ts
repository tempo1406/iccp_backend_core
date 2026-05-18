// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddUserLocale1776600000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddUserLocale1776600000000 implements MigrationInterface {
// // // // // //   name = 'AddUserLocale1776600000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "auth"."users"
// // // // // //       ADD COLUMN IF NOT EXISTS "locale" character varying(10)
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "auth"."users"
// // // // // //       DROP COLUMN IF EXISTS "locale"
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 