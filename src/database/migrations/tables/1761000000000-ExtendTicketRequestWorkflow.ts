// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: ExtendTicketRequestWorkflow1761000000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class ExtendTicketRequestWorkflow1761000000000 implements MigrationInterface {
// // // // // //   name = 'ExtendTicketRequestWorkflow1761000000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1
// // // // // //           FROM pg_type t
// // // // // //           JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE t.typname = 'ticket_request_workflow_code'
// // // // // //             AND n.nspname = 'tenant'
// // // // // //         ) THEN
// // // // // //           CREATE TYPE "tenant"."ticket_request_workflow_code" AS ENUM (
// // // // // //             'working_time',
// // // // // //             'overtime_opic',
// // // // // //             'overtime_standard'
// // // // // //           );
// // // // // //         END IF;
// // // // // // 
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ADD COLUMN IF NOT EXISTS "workflow_code" "tenant"."ticket_request_workflow_code" NOT NULL DEFAULT 'working_time';
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ADD COLUMN IF NOT EXISTS "current_step_code" varchar(80) NOT NULL DEFAULT 'supervisor_confirm';
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ADD COLUMN IF NOT EXISTS "current_step_order" int NOT NULL DEFAULT 1;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ADD COLUMN IF NOT EXISTS "effort_owner_id" uuid NULL;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ADD COLUMN IF NOT EXISTS "request_type_code" varchar(120) NULL;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ADD COLUMN IF NOT EXISTS "request_type_name" varchar(255) NULL;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ADD COLUMN IF NOT EXISTS "reason_code" varchar(255) NULL;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ADD COLUMN IF NOT EXISTS "reason_detail" text NULL;
// // // // // //     `);
// // // // // // 
// // // // // //     // NOTE:
// // // // // //     // Do not use `ALTER TYPE ... ADD VALUE` then immediately use that new enum value
// // // // // //     // in the same migration transaction (Postgres 55P04 unsafe enum use).
// // // // // //     await queryRunner.query(`
// // // // // //       WITH "workflow_flags" AS (
// // // // // //         SELECT
// // // // // //           EXISTS (
// // // // // //             SELECT 1
// // // // // //             FROM pg_type t
// // // // // //             JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //             JOIN pg_enum e ON e.enumtypid = t.oid
// // // // // //             WHERE t.typname = 'ticket_request_workflow_code'
// // // // // //               AND n.nspname = 'tenant'
// // // // // //               AND e.enumlabel = 'overtime_standard'
// // // // // //           ) AS "has_overtime_standard",
// // // // // //           EXISTS (
// // // // // //             SELECT 1
// // // // // //             FROM pg_type t
// // // // // //             JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //             JOIN pg_enum e ON e.enumtypid = t.oid
// // // // // //             WHERE t.typname = 'ticket_request_workflow_code'
// // // // // //               AND n.nspname = 'tenant'
// // // // // //               AND e.enumlabel = 'overtime_standard_direct'
// // // // // //           ) AS "has_overtime_standard_direct"
// // // // // //       )
// // // // // //       UPDATE "tenant"."ticket_requests" "tr"
// // // // // //       SET
// // // // // //         "workflow_code" = CASE
// // // // // //           WHEN "tr"."type" = 'overtime' THEN (
// // // // // //             CASE
// // // // // //               WHEN "workflow_flags"."has_overtime_standard" THEN 'overtime_standard'
// // // // // //               WHEN "workflow_flags"."has_overtime_standard_direct" THEN 'overtime_standard_direct'
// // // // // //               ELSE 'working_time'
// // // // // //             END
// // // // // //           )::"tenant"."ticket_request_workflow_code"
// // // // // //           ELSE 'working_time'::"tenant"."ticket_request_workflow_code"
// // // // // //         END,
// // // // // //         "effort_owner_id" = COALESCE("tr"."effort_owner_id", "tr"."requester_id"),
// // // // // //         "request_type_code" = COALESCE(
// // // // // //           "tr"."request_type_code",
// // // // // //           CASE
// // // // // //             WHEN "tr"."type" = 'wfh' THEN 'work_from_home'
// // // // // //             WHEN "tr"."type" = 'overtime' THEN 'overtime_request'
// // // // // //             WHEN "tr"."type" = 'advance' THEN 'advance_salary'
// // // // // //             WHEN "tr"."type" = 'general' THEN 'general_request'
// // // // // //             ELSE 'paid_leave'
// // // // // //           END
// // // // // //         ),
// // // // // //         "request_type_name" = COALESCE(
// // // // // //           "tr"."request_type_name",
// // // // // //           CASE
// // // // // //             WHEN "tr"."type" = 'wfh' THEN 'Work from home'
// // // // // //             WHEN "tr"."type" = 'overtime' THEN 'Overtime request'
// // // // // //             WHEN "tr"."type" = 'advance' THEN 'Advance salary request'
// // // // // //             WHEN "tr"."type" = 'general' THEN 'General request'
// // // // // //             ELSE 'Paid leave'
// // // // // //           END
// // // // // //         ),
// // // // // //         "current_step_code" = CASE
// // // // // //           WHEN "tr"."status" = 'approved' THEN 'completed'
// // // // // //           WHEN "tr"."status" = 'rejected' THEN 'rejected'
// // // // // //           WHEN "tr"."status" = 'canceled' THEN 'canceled'
// // // // // //           WHEN "tr"."status" = 'changes_requested' AND "tr"."type" = 'overtime' THEN 'pm_create_request'
// // // // // //           WHEN "tr"."status" = 'changes_requested' THEN 'emp_create_request'
// // // // // //           WHEN "tr"."status" = 'pending_approval' AND "tr"."type" = 'overtime' THEN 'bul_approve_pre'
// // // // // //           ELSE 'supervisor_confirm'
// // // // // //         END,
// // // // // //         "current_step_order" = CASE
// // // // // //           WHEN "tr"."status" = 'approved' THEN 99
// // // // // //           WHEN "tr"."status" = 'rejected' THEN 99
// // // // // //           WHEN "tr"."status" = 'canceled' THEN 99
// // // // // //           WHEN "tr"."status" = 'changes_requested' THEN 0
// // // // // //           WHEN "tr"."status" = 'pending_approval' AND "tr"."type" = 'overtime' THEN 1
// // // // // //           ELSE 1
// // // // // //         END,
// // // // // //         "reason_detail" = COALESCE("tr"."reason_detail", "tr"."content")
// // // // // //       FROM "workflow_flags"
// // // // // //       WHERE "tr"."deleted_at" IS NULL;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_ticket_requests_org_workflow_step"
// // // // // //       ON "tenant"."ticket_requests" ("organization_id", "workflow_code", "current_step_code");
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_ticket_requests_org_request_type_code"
// // // // // //       ON "tenant"."ticket_requests" ("organization_id", "request_type_code");
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF to_regclass('auth.users') IS NOT NULL
// // // // // //           AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_requests_effort_owner') THEN
// // // // // //           ALTER TABLE "tenant"."ticket_requests"
// // // // // //           ADD CONSTRAINT "FK_ticket_requests_effort_owner"
// // // // // //           FOREIGN KEY ("effort_owner_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_requests_effort_owner') THEN
// // // // // //           ALTER TABLE "tenant"."ticket_requests"
// // // // // //           DROP CONSTRAINT "FK_ticket_requests_effort_owner";
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DROP INDEX IF EXISTS "tenant"."IDX_ticket_requests_org_request_type_code";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DROP INDEX IF EXISTS "tenant"."IDX_ticket_requests_org_workflow_step";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP COLUMN IF EXISTS "reason_detail";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP COLUMN IF EXISTS "reason_code";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP COLUMN IF EXISTS "request_type_name";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP COLUMN IF EXISTS "request_type_code";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP COLUMN IF EXISTS "effort_owner_id";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP COLUMN IF EXISTS "current_step_order";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP COLUMN IF EXISTS "current_step_code";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP COLUMN IF EXISTS "workflow_code";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DROP TYPE IF EXISTS "tenant"."ticket_request_workflow_code";
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 