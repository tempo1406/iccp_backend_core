// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: FixOrgHolidaysSchema1764400000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class FixOrgHolidaysSchema1764400000000 implements MigrationInterface {
// // // // // //   name = 'FixOrgHolidaysSchema1764400000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Drop old table and enum (created with wrong schema in KpiAndSettingsTables migration)
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "tenant"."org_holidays"`);
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TYPE IF EXISTS "tenant"."org_holiday_type"`,
// // // // // //     );
// // // // // // 
// // // // // //     // Create correct enum matching OrgHolidayType entity
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TYPE "tenant"."org_holiday_type" AS ENUM (
// // // // // //         'national_holiday',
// // // // // //         'company_holiday',
// // // // // //         'special_day'
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     // Create correct table matching OrgHoliday entity
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "tenant"."org_holidays" (
// // // // // //         "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "organization_id" UUID          NOT NULL,
// // // // // //         "date"            DATE          NOT NULL,
// // // // // //         "name"            VARCHAR(255)  NOT NULL,
// // // // // //         "type"            "tenant"."org_holiday_type" NOT NULL DEFAULT 'national_holiday',
// // // // // //         "working_hours"   NUMERIC(4,2)  NOT NULL DEFAULT 0.00,
// // // // // //         "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
// // // // // //         "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
// // // // // //         "deleted_at"      TIMESTAMPTZ,
// // // // // //         CONSTRAINT "PK_org_holidays" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_org_holidays_org_date" UNIQUE ("organization_id", "date")
// // // // // //       )
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "tenant"."org_holidays"`);
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TYPE IF EXISTS "tenant"."org_holiday_type"`,
// // // // // //     );
// // // // // // 
// // // // // //     // Restore original (incorrect) schema
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TYPE "tenant"."org_holiday_type" AS ENUM ('full', 'half_am', 'half_pm')
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "tenant"."org_holidays" (
// // // // // //         "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "organization_id" UUID          NOT NULL,
// // // // // //         "date"            DATE          NOT NULL,
// // // // // //         "name"            VARCHAR(200)  NOT NULL,
// // // // // //         "type"            "tenant"."org_holiday_type" NOT NULL DEFAULT 'full',
// // // // // //         "hours_off"       NUMERIC(4,2)  NOT NULL DEFAULT 8,
// // // // // //         "created_by"      UUID,
// // // // // //         "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
// // // // // //         "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
// // // // // //         "deleted_at"      TIMESTAMPTZ,
// // // // // //         CONSTRAINT "PK_org_holidays" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_org_holidays_org_date" UNIQUE ("organization_id", "date")
// // // // // //       )
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 