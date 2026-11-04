// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddMissingColumnsTaskAndOrgSettings1776540000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddMissingColumnsTaskAndOrgSettings1776540000000 implements MigrationInterface {
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Add actual_logged_minutes to project.tasks
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE project.tasks
// // // // // //       ADD COLUMN IF NOT EXISTS actual_logged_minutes INT NOT NULL DEFAULT 0
// // // // // //     `);
// // // // // // 
// // // // // //     // Add last_digest_sent_at to tenant.org_settings
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE tenant.org_settings
// // // // // //       ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMPTZ NULL
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE project.tasks
// // // // // //       DROP COLUMN IF EXISTS actual_logged_minutes
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE tenant.org_settings
// // // // // //       DROP COLUMN IF EXISTS last_digest_sent_at
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 