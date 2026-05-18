// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: RemoveMeetingColumns1776510000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class RemoveMeetingColumns1776510000000 implements MigrationInterface {
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE project.project_configs
// // // // // //         DROP COLUMN IF EXISTS daily_reminder_minutes,
// // // // // //         DROP COLUMN IF EXISTS weekly_enabled,
// // // // // //         DROP COLUMN IF EXISTS weekly_day,
// // // // // //         DROP COLUMN IF EXISTS weekly_time,
// // // // // //         DROP COLUMN IF EXISTS weekly_reminder_minutes
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE project.project_configs
// // // // // //         ADD COLUMN IF NOT EXISTS daily_reminder_minutes int NOT NULL DEFAULT 15,
// // // // // //         ADD COLUMN IF NOT EXISTS weekly_enabled boolean NOT NULL DEFAULT false,
// // // // // //         ADD COLUMN IF NOT EXISTS weekly_day int NOT NULL DEFAULT 5,
// // // // // //         ADD COLUMN IF NOT EXISTS weekly_time varchar(5),
// // // // // //         ADD COLUMN IF NOT EXISTS weekly_reminder_minutes int NOT NULL DEFAULT 30
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 