// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: FixProjectConfigSchema1764300000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class FixProjectConfigSchema1764300000000 implements MigrationInterface {
// // // // // //   name = 'FixProjectConfigSchema1764300000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Drop the old table (created with wrong column names in KpiAndSettingsTables migration)
// // // // // //     // and recreate with schema matching the ProjectConfig entity.
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "project"."project_configs"`);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "project"."project_configs" (
// // // // // //         "id"                            UUID          NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "project_id"                    UUID          NOT NULL,
// // // // // //         "organization_id"               UUID          NOT NULL,
// // // // // // 
// // // // // //         -- Daily Standup
// // // // // //         "daily_enabled"                 BOOLEAN       NOT NULL DEFAULT false,
// // // // // //         "daily_time"                    TIME,
// // // // // //         "daily_days"                    INTEGER[]     NOT NULL DEFAULT ARRAY[1,2,3,4,5],
// // // // // //         "daily_reminder_minutes"        INTEGER       NOT NULL DEFAULT 15,
// // // // // // 
// // // // // //         -- Weekly Review
// // // // // //         "weekly_enabled"                BOOLEAN       NOT NULL DEFAULT false,
// // // // // //         "weekly_day"                    INTEGER       NOT NULL DEFAULT 5,
// // // // // //         "weekly_time"                   TIME,
// // // // // //         "weekly_reminder_minutes"       INTEGER       NOT NULL DEFAULT 30,
// // // // // // 
// // // // // //         -- Task Deadline Reminder
// // // // // //         "task_due_reminder_enabled"     BOOLEAN       NOT NULL DEFAULT true,
// // // // // //         "task_due_reminder_hours"       INTEGER[]     NOT NULL DEFAULT ARRAY[24,2],
// // // // // //         "reminder_channels"             TEXT[]        NOT NULL DEFAULT ARRAY['push_notification','in_app'],
// // // // // //         "overdue_escalation_enabled"    BOOLEAN       NOT NULL DEFAULT false,
// // // // // //         "overdue_escalation_after_hours" INTEGER      NOT NULL DEFAULT 4,
// // // // // // 
// // // // // //         -- Point Scale
// // // // // //         "point_scale_type"              VARCHAR(20),
// // // // // //         "point_scale_values"            INTEGER[],
// // // // // //         "max_point_per_task"            INTEGER,
// // // // // // 
// // // // // //         -- KPI Weights (null = inherit org)
// // // // // //         "kpi_weight_point_completion"   NUMERIC(4,3),
// // // // // //         "kpi_weight_on_time"            NUMERIC(4,3),
// // // // // //         "kpi_weight_ot_contribution"    NUMERIC(4,3),
// // // // // // 
// // // // // //         -- Bonus Rules (null = inherit org)
// // // // // //         "bonus_enabled"                 BOOLEAN,
// // // // // //         "bonus_on_time_task"            NUMERIC(5,2),
// // // // // //         "bonus_early_task_hours"        INTEGER,
// // // // // //         "bonus_early_task"              NUMERIC(5,2),
// // // // // //         "bonus_zero_overdue"            NUMERIC(5,2),
// // // // // //         "bonus_max_cap"                 NUMERIC(5,2),
// // // // // //         "bonus_ot_per_effective_hour"   NUMERIC(5,2),
// // // // // // 
// // // // // //         "created_at"                    TIMESTAMPTZ   NOT NULL DEFAULT now(),
// // // // // //         "updated_at"                    TIMESTAMPTZ   NOT NULL DEFAULT now(),
// // // // // // 
// // // // // //         CONSTRAINT "PK_project_configs" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_project_configs_project" UNIQUE ("project_id")
// // // // // //       )
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "project"."project_configs"`);
// // // // // // 
// // // // // //     // Restore the original (incorrect) schema from KpiAndSettingsTables migration
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE "project"."project_configs" (
// // // // // //         "id"                         UUID         NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "project_id"                 UUID         NOT NULL,
// // // // // //         "organization_id"            UUID         NOT NULL,
// // // // // //         "daily_standup_enabled"      BOOLEAN      NOT NULL DEFAULT false,
// // // // // //         "daily_standup_time"         TIME,
// // // // // //         "weekly_review_enabled"      BOOLEAN      NOT NULL DEFAULT false,
// // // // // //         "weekly_review_day"          SMALLINT,
// // // // // //         "weekly_review_time"         TIME,
// // // // // //         "task_due_reminder_hours"    INTEGER      NOT NULL DEFAULT 24,
// // // // // //         "overdue_reminder_enabled"   BOOLEAN      NOT NULL DEFAULT true,
// // // // // //         "point_scale"                VARCHAR(20)  NOT NULL DEFAULT 'fibonacci',
// // // // // //         "kpi_weight_completion"      NUMERIC(4,3),
// // // // // //         "kpi_weight_on_time"         NUMERIC(4,3),
// // // // // //         "kpi_weight_ot"              NUMERIC(4,3),
// // // // // //         "bonus_max_cap"              NUMERIC(6,2),
// // // // // //         "bonus_per_on_time_task"     NUMERIC(6,2),
// // // // // //         "bonus_per_early_task"       NUMERIC(6,2),
// // // // // //         "bonus_zero_overdue"         NUMERIC(6,2),
// // // // // //         "bonus_per_ot_hour"          NUMERIC(6,2),
// // // // // //         "created_at"                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
// // // // // //         "updated_at"                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_project_configs" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_project_configs_project" UNIQUE ("project_id")
// // // // // //       )
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 