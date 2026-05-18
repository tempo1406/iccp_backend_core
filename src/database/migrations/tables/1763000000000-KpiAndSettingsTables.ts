// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: KpiAndSettingsTables1763000000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class KpiAndSettingsTables1763000000000 implements MigrationInterface {
// // // // // //   name = 'KpiAndSettingsTables1763000000000';
// // // // // // 
// // // // // //   private readonly kpiPermissions = [
// // // // // //     'analytics.kpi.view_project',
// // // // // //     'analytics.kpi.view_org',
// // // // // //     'org_config.working_time.view',
// // // // // //     'org_config.working_time.manage',
// // // // // //     'org_config.settings.view',
// // // // // //     'org_config.settings.manage',
// // // // // //   ];
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     // 1. ALTER project.tasks — add estimated_point, estimated_hours
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "project"."tasks"
// // // // // //         ADD COLUMN IF NOT EXISTS "estimated_point"  INTEGER,
// // // // // //         ADD COLUMN IF NOT EXISTS "estimated_hours"  NUMERIC(6,2)
// // // // // //     `);
// // // // // // 
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     // 2. ALTER project.project_members — add allocated_hours_per_day
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "project"."project_members"
// // // // // //         ADD COLUMN IF NOT EXISTS "allocated_hours_per_day" NUMERIC(4,2)
// // // // // //     `);
// // // // // // 
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     // 3. CREATE tenant.org_working_time_configs
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "tenant"."org_working_time_configs" (
// // // // // //         "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "organization_id" UUID        NOT NULL,
// // // // // //         "monday_hours"    NUMERIC(4,2) NOT NULL DEFAULT 8,
// // // // // //         "tuesday_hours"   NUMERIC(4,2) NOT NULL DEFAULT 8,
// // // // // //         "wednesday_hours" NUMERIC(4,2) NOT NULL DEFAULT 8,
// // // // // //         "thursday_hours"  NUMERIC(4,2) NOT NULL DEFAULT 8,
// // // // // //         "friday_hours"    NUMERIC(4,2) NOT NULL DEFAULT 8,
// // // // // //         "saturday_hours"  NUMERIC(4,2) NOT NULL DEFAULT 0,
// // // // // //         "sunday_hours"    NUMERIC(4,2) NOT NULL DEFAULT 0,
// // // // // //         "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
// // // // // //         "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_org_working_time_configs" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_org_working_time_configs_org" UNIQUE ("organization_id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     // 4. CREATE tenant.org_holidays
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$ BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1 FROM pg_type t
// // // // // //           JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE t.typname = 'org_holiday_type' AND n.nspname = 'tenant'
// // // // // //         ) THEN
// // // // // //           CREATE TYPE "tenant"."org_holiday_type" AS ENUM ('full', 'half_am', 'half_pm');
// // // // // //         END IF;
// // // // // //       END $$
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "tenant"."org_holidays" (
// // // // // //         "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "organization_id" UUID        NOT NULL,
// // // // // //         "date"            DATE        NOT NULL,
// // // // // //         "name"            VARCHAR(200) NOT NULL,
// // // // // //         "type"            "tenant"."org_holiday_type" NOT NULL DEFAULT 'full',
// // // // // //         "hours_off"       NUMERIC(4,2) NOT NULL DEFAULT 8,
// // // // // //         "created_by"      UUID,
// // // // // //         "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
// // // // // //         "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
// // // // // //         "deleted_at"      TIMESTAMPTZ,
// // // // // //         CONSTRAINT "PK_org_holidays" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_org_holidays_org_date" UNIQUE ("organization_id", "date")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     // 5. CREATE project.project_configs
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "project"."project_configs" (
// // // // // //         "id"                         UUID         NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "project_id"                 UUID         NOT NULL,
// // // // // //         "organization_id"            UUID         NOT NULL,
// // // // // // 
// // // // // //         "daily_standup_enabled"      BOOLEAN      NOT NULL DEFAULT false,
// // // // // //         "daily_standup_time"         TIME,
// // // // // //         "weekly_review_enabled"      BOOLEAN      NOT NULL DEFAULT false,
// // // // // //         "weekly_review_day"          SMALLINT,
// // // // // //         "weekly_review_time"         TIME,
// // // // // // 
// // // // // //         "task_due_reminder_hours"    INTEGER      NOT NULL DEFAULT 24,
// // // // // //         "overdue_reminder_enabled"   BOOLEAN      NOT NULL DEFAULT true,
// // // // // // 
// // // // // //         "point_scale"                VARCHAR(20)  NOT NULL DEFAULT 'fibonacci',
// // // // // // 
// // // // // //         "kpi_weight_completion"      NUMERIC(4,3),
// // // // // //         "kpi_weight_on_time"         NUMERIC(4,3),
// // // // // //         "kpi_weight_ot"              NUMERIC(4,3),
// // // // // // 
// // // // // //         "bonus_max_cap"              NUMERIC(6,2),
// // // // // //         "bonus_per_on_time_task"     NUMERIC(6,2),
// // // // // //         "bonus_per_early_task"       NUMERIC(6,2),
// // // // // //         "bonus_zero_overdue"         NUMERIC(6,2),
// // // // // //         "bonus_per_ot_hour"          NUMERIC(6,2),
// // // // // // 
// // // // // //         "created_at"                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
// // // // // //         "updated_at"                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_project_configs" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_project_configs_project" UNIQUE ("project_id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     // 6. CREATE tenant.org_settings
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "tenant"."org_settings" (
// // // // // //         "id"                         UUID         NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "organization_id"            UUID         NOT NULL,
// // // // // // 
// // // // // //         "kpi_weight_completion"      NUMERIC(4,3) NOT NULL DEFAULT 0.500,
// // // // // //         "kpi_weight_on_time"         NUMERIC(4,3) NOT NULL DEFAULT 0.300,
// // // // // //         "kpi_weight_ot"              NUMERIC(4,3) NOT NULL DEFAULT 0.200,
// // // // // // 
// // // // // //         "ot_multiplier_weekday"      NUMERIC(4,2) NOT NULL DEFAULT 1.50,
// // // // // //         "ot_multiplier_weekend"      NUMERIC(4,2) NOT NULL DEFAULT 2.00,
// // // // // //         "ot_multiplier_holiday"      NUMERIC(4,2) NOT NULL DEFAULT 3.00,
// // // // // // 
// // // // // //         "bonus_max_cap"              NUMERIC(6,2) NOT NULL DEFAULT 20.00,
// // // // // //         "bonus_per_on_time_task"     NUMERIC(6,2) NOT NULL DEFAULT 0.50,
// // // // // //         "bonus_per_early_task"       NUMERIC(6,2) NOT NULL DEFAULT 1.00,
// // // // // //         "bonus_zero_overdue"         NUMERIC(6,2) NOT NULL DEFAULT 5.00,
// // // // // //         "bonus_per_ot_hour"          NUMERIC(6,2) NOT NULL DEFAULT 0.10,
// // // // // // 
// // // // // //         "notify_email"               BOOLEAN      NOT NULL DEFAULT true,
// // // // // //         "notify_in_app"              BOOLEAN      NOT NULL DEFAULT true,
// // // // // //         "digest_enabled"             BOOLEAN      NOT NULL DEFAULT false,
// // // // // //         "digest_cron"                VARCHAR(50),
// // // // // // 
// // // // // //         "created_at"                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
// // // // // //         "updated_at"                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_org_settings" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_org_settings_org" UNIQUE ("organization_id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     // 7. Insert new permissions into rbac.permissions
// // // // // //     // ────────────────────────────────────────────────────────────────
// // // // // //     const hasPermissionTable = await queryRunner.hasTable('rbac.permissions');
// // // // // //     const hasRoleTable = await queryRunner.hasTable('rbac.roles');
// // // // // //     const hasRolePermissionTable = await queryRunner.hasTable(
// // // // // //       'rbac.role_permissions',
// // // // // //     );
// // // // // // 
// // // // // //     if (hasPermissionTable) {
// // // // // //       for (const perm of this.kpiPermissions) {
// // // // // //         const parts = perm.split('.');
// // // // // //         const module = parts[0];
// // // // // //         const name = parts.slice(1).join('.');
// // // // // //         await queryRunner.query(
// // // // // //           `
// // // // // //           INSERT INTO "rbac"."permissions" ("code", "name", "module", "description")
// // // // // //           VALUES ($1, $2, $3, $4)
// // // // // //           ON CONFLICT ("code") DO NOTHING
// // // // // //         `,
// // // // // //           [perm, name, module, ''],
// // // // // //         );
// // // // // //       }
// // // // // //     }
// // // // // // 
// // // // // //     if (hasPermissionTable && hasRoleTable && hasRolePermissionTable) {
// // // // // //       // Grant kpi view_org + org_config permissions to all existing Org Admin roles
// // // // // //       await queryRunner.query(`
// // // // // //         INSERT INTO "rbac"."role_permissions" ("role_id", "permission_id")
// // // // // //         SELECT r.id, p.id
// // // // // //         FROM "rbac"."roles" r
// // // // // //         CROSS JOIN "rbac"."permissions" p
// // // // // //         WHERE r.name = 'org_admin'
// // // // // //           AND p.code = ANY(ARRAY[
// // // // // //             'analytics.kpi.view_project',
// // // // // //             'analytics.kpi.view_org',
// // // // // //             'org_config.working_time.view',
// // // // // //             'org_config.working_time.manage',
// // // // // //             'org_config.settings.view',
// // // // // //             'org_config.settings.manage'
// // // // // //           ])
// // // // // //         ON CONFLICT DO NOTHING
// // // // // //       `);
// // // // // // 
// // // // // //       // Grant kpi view_project + working_time view to all existing PM roles
// // // // // //       await queryRunner.query(`
// // // // // //         INSERT INTO "rbac"."role_permissions" ("role_id", "permission_id")
// // // // // //         SELECT r.id, p.id
// // // // // //         FROM "rbac"."roles" r
// // // // // //         CROSS JOIN "rbac"."permissions" p
// // // // // //         WHERE r.name = 'project_manager'
// // // // // //           AND p.code = ANY(ARRAY[
// // // // // //             'analytics.kpi.view_project',
// // // // // //             'org_config.working_time.view'
// // // // // //           ])
// // // // // //         ON CONFLICT DO NOTHING
// // // // // //       `);
// // // // // // 
// // // // // //       // Grant view permissions to all member-level roles
// // // // // //       await queryRunner.query(`
// // // // // //         INSERT INTO "rbac"."role_permissions" ("role_id", "permission_id")
// // // // // //         SELECT r.id, p.id
// // // // // //         FROM "rbac"."roles" r
// // // // // //         CROSS JOIN "rbac"."permissions" p
// // // // // //         WHERE r.name IN ('member', 'viewer')
// // // // // //           AND p.code = 'org_config.working_time.view'
// // // // // //         ON CONFLICT DO NOTHING
// // // // // //       `);
// // // // // //     }
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Remove permissions
// // // // // //     const hasPermissionTable = await queryRunner.hasTable('rbac.permissions');
// // // // // //     const hasRolePermissionTable = await queryRunner.hasTable(
// // // // // //       'rbac.role_permissions',
// // // // // //     );
// // // // // // 
// // // // // //     if (hasPermissionTable && hasRolePermissionTable) {
// // // // // //       await queryRunner.query(`
// // // // // //         DELETE FROM "rbac"."role_permissions" rp
// // // // // //         USING "rbac"."permissions" p
// // // // // //         WHERE rp.permission_id = p.id
// // // // // //           AND p.code = ANY(ARRAY[
// // // // // //             'analytics.kpi.view_project',
// // // // // //             'analytics.kpi.view_org',
// // // // // //             'org_config.working_time.view',
// // // // // //             'org_config.working_time.manage',
// // // // // //             'org_config.settings.view',
// // // // // //             'org_config.settings.manage'
// // // // // //           ])
// // // // // //       `);
// // // // // //     }
// // // // // // 
// // // // // //     if (hasPermissionTable) {
// // // // // //       await queryRunner.query(`
// // // // // //         DELETE FROM "rbac"."permissions"
// // // // // //         WHERE "code" = ANY(ARRAY[
// // // // // //           'analytics.kpi.view_project',
// // // // // //           'analytics.kpi.view_org',
// // // // // //           'org_config.working_time.view',
// // // // // //           'org_config.working_time.manage',
// // // // // //           'org_config.settings.view',
// // // // // //           'org_config.settings.manage'
// // // // // //         ])
// // // // // //       `);
// // // // // //     }
// // // // // // 
// // // // // //     // Drop new tables
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "tenant"."org_settings"`);
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "project"."project_configs"`);
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "tenant"."org_holidays"`);
// // // // // //     await queryRunner.query(`DROP TYPE IF EXISTS "tenant"."org_holiday_type"`);
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TABLE IF EXISTS "tenant"."org_working_time_configs"`,
// // // // // //     );
// // // // // // 
// // // // // //     // Remove added columns
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "project"."project_members"
// // // // // //         DROP COLUMN IF EXISTS "allocated_hours_per_day"
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "project"."tasks"
// // // // // //         DROP COLUMN IF EXISTS "estimated_hours",
// // // // // //         DROP COLUMN IF EXISTS "estimated_point"
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 