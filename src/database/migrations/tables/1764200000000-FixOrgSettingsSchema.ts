// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: FixOrgSettingsSchema1764200000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class FixOrgSettingsSchema1764200000000 implements MigrationInterface {
// // // // // //   name = 'FixOrgSettingsSchema1764200000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Drop the old table (created with wrong column names in KpiAndSettingsTables migration)
// // // // // //     // and recreate with schema matching the OrgSettings entity.
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "tenant"."org_settings"`);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "tenant"."org_settings" (
// // // // // //         "id"                            UUID          NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "organization_id"               UUID          NOT NULL,
// // // // // // 
// // // // // //         -- KPI Weights
// // // // // //         "default_weight_point_completion" NUMERIC(4,3) NOT NULL DEFAULT 0.500,
// // // // // //         "default_weight_on_time"          NUMERIC(4,3) NOT NULL DEFAULT 0.300,
// // // // // //         "default_weight_ot_contribution"  NUMERIC(4,3) NOT NULL DEFAULT 0.200,
// // // // // // 
// // // // // //         -- OT Multipliers
// // // // // //         "ot_multiplier_weekday"           NUMERIC(4,2) NOT NULL DEFAULT 1.00,
// // // // // //         "ot_multiplier_saturday"          NUMERIC(4,2) NOT NULL DEFAULT 1.50,
// // // // // //         "ot_multiplier_sunday"            NUMERIC(4,2) NOT NULL DEFAULT 2.00,
// // // // // //         "ot_multiplier_holiday"           NUMERIC(4,2) NOT NULL DEFAULT 3.00,
// // // // // // 
// // // // // //         -- Bonus Rules
// // // // // //         "bonus_enabled"                   BOOLEAN      NOT NULL DEFAULT false,
// // // // // //         "bonus_on_time_task"              NUMERIC(5,2) NOT NULL DEFAULT 0.50,
// // // // // //         "bonus_early_task_hours"          INTEGER      NOT NULL DEFAULT 24,
// // // // // //         "bonus_early_task"                NUMERIC(5,2) NOT NULL DEFAULT 1.00,
// // // // // //         "bonus_zero_overdue"              NUMERIC(5,2) NOT NULL DEFAULT 2.00,
// // // // // //         "bonus_max_cap"                   NUMERIC(5,2) NOT NULL DEFAULT 10.00,
// // // // // //         "bonus_ot_per_effective_hour"     NUMERIC(5,2) NOT NULL DEFAULT 0.20,
// // // // // // 
// // // // // //         -- Notification Defaults
// // // // // //         "default_reminder_channels"       TEXT[]       NOT NULL DEFAULT ARRAY['push_notification','in_app'],
// // // // // // 
// // // // // //         -- KPI Digest
// // // // // //         "digest_enabled"                  BOOLEAN      NOT NULL DEFAULT false,
// // // // // //         "digest_day"                      INTEGER      NOT NULL DEFAULT 1,
// // // // // //         "digest_time"                     TIME         NOT NULL DEFAULT '08:00',
// // // // // //         "digest_recipients"               TEXT[]       NOT NULL DEFAULT ARRAY['org_admin'],
// // // // // //         "digest_channels"                 TEXT[]       NOT NULL DEFAULT ARRAY['email','in_app'],
// // // // // // 
// // // // // //         "created_at"                      TIMESTAMPTZ  NOT NULL DEFAULT now(),
// // // // // //         "updated_at"                      TIMESTAMPTZ  NOT NULL DEFAULT now(),
// // // // // // 
// // // // // //         CONSTRAINT "PK_org_settings" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_org_settings_org" UNIQUE ("organization_id")
// // // // // //       )
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "tenant"."org_settings"`);
// // // // // // 
// // // // // //     // Restore the original (incorrect) schema from KpiAndSettingsTables migration
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "tenant"."org_settings" (
// // // // // //         "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "organization_id"     UUID         NOT NULL,
// // // // // //         "kpi_weight_completion" NUMERIC(4,3) NOT NULL DEFAULT 0.500,
// // // // // //         "kpi_weight_on_time"  NUMERIC(4,3) NOT NULL DEFAULT 0.300,
// // // // // //         "kpi_weight_ot"       NUMERIC(4,3) NOT NULL DEFAULT 0.200,
// // // // // //         "ot_multiplier_weekday" NUMERIC(4,2) NOT NULL DEFAULT 1.50,
// // // // // //         "ot_multiplier_weekend" NUMERIC(4,2) NOT NULL DEFAULT 2.00,
// // // // // //         "ot_multiplier_holiday" NUMERIC(4,2) NOT NULL DEFAULT 3.00,
// // // // // //         "bonus_max_cap"       NUMERIC(6,2) NOT NULL DEFAULT 20.00,
// // // // // //         "bonus_per_on_time_task" NUMERIC(6,2) NOT NULL DEFAULT 0.50,
// // // // // //         "bonus_per_early_task" NUMERIC(6,2) NOT NULL DEFAULT 1.00,
// // // // // //         "bonus_zero_overdue"  NUMERIC(6,2) NOT NULL DEFAULT 5.00,
// // // // // //         "bonus_per_ot_hour"   NUMERIC(6,2) NOT NULL DEFAULT 0.10,
// // // // // //         "notify_email"        BOOLEAN      NOT NULL DEFAULT true,
// // // // // //         "notify_in_app"       BOOLEAN      NOT NULL DEFAULT true,
// // // // // //         "digest_enabled"      BOOLEAN      NOT NULL DEFAULT false,
// // // // // //         "digest_cron"         VARCHAR(50),
// // // // // //         "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
// // // // // //         "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_org_settings" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_org_settings_org" UNIQUE ("organization_id")
// // // // // //       )
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 