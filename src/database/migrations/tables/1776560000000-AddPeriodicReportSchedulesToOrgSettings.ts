// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddPeriodicReportSchedulesToOrgSettings1776560000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddPeriodicReportSchedulesToOrgSettings1776560000000 implements MigrationInterface {
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE tenant.org_settings
// // // // // //       ADD COLUMN IF NOT EXISTS periodic_report_schedules JSONB
// // // // // //       DEFAULT '[{"frequency":"monthly","enabled":false,"sendTime":"08:00","sendDelayDays":1,"scopes":["org_summary","project_summary","member_kpi"],"recipientGroups":["org_admin"],"channels":["email","in_app"]}]'::jsonb
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE tenant.org_settings
// // // // // //       DROP COLUMN IF EXISTS periodic_report_schedules
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 