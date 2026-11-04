// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: FixTicketRequestStatusEnum1764000000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class FixTicketRequestStatusEnum1764000000000 implements MigrationInterface {
// // // // // //   name = 'FixTicketRequestStatusEnum1764000000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // ─── 1. Ensure pending_submission value exists in the current enum ────────
// // // // // //     // (safe to run even if already added by previous migration)
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1 FROM pg_enum
// // // // // //           WHERE enumtypid = 'tenant.ticket_request_status'::regtype
// // // // // //             AND enumlabel = 'pending_submission'
// // // // // //         ) THEN
// // // // // //           ALTER TYPE "tenant"."ticket_request_status"
// // // // // //           ADD VALUE 'pending_submission';
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // // 
// // // // // //     // ─── 2. Fix stuck _old type left by TypeORM synchronize ──────────────────
// // // // // //     // When synchronize tries to update an enum with multi-table dependencies,
// // // // // //     // it renames the old type to <name>_old but fails to DROP it because
// // // // // //     // ticket_request_activities.from_status / to_status still reference it.
// // // // // //     // We fix this by migrating those columns to the current enum, then dropping.
// // // // // // 
// // // // // //     const [{ oldTypeExists }] = await queryRunner.query(`
// // // // // //       SELECT EXISTS (
// // // // // //         SELECT 1 FROM pg_type
// // // // // //         WHERE typname = 'ticket_request_status_old'
// // // // // //           AND typnamespace = (
// // // // // //             SELECT oid FROM pg_namespace WHERE nspname = 'tenant'
// // // // // //           )
// // // // // //       ) AS "oldTypeExists"
// // // // // //     `);
// // // // // // 
// // // // // //     if (oldTypeExists) {
// // // // // //       // Migrate from_status column to current enum
// // // // // //       await queryRunner.query(`
// // // // // //         ALTER TABLE "tenant"."ticket_request_activities"
// // // // // //         ALTER COLUMN "from_status" TYPE "tenant"."ticket_request_status"
// // // // // //         USING "from_status"::text::"tenant"."ticket_request_status"
// // // // // //       `);
// // // // // // 
// // // // // //       // Migrate to_status column to current enum
// // // // // //       await queryRunner.query(`
// // // // // //         ALTER TABLE "tenant"."ticket_request_activities"
// // // // // //         ALTER COLUMN "to_status" TYPE "tenant"."ticket_request_status"
// // // // // //         USING "to_status"::text::"tenant"."ticket_request_status"
// // // // // //       `);
// // // // // // 
// // // // // //       // Now safe to drop the stuck old type
// // // // // //       await queryRunner.query(`
// // // // // //         DROP TYPE "tenant"."ticket_request_status_old"
// // // // // //       `);
// // // // // //     }
// // // // // // 
// // // // // //     // ─── 3. Fix ORG_* step code casing (idempotent) ──────────────────────────
// // // // // //     // Normalize inconsistent uppercase prefix in current_step_code values
// // // // // //     await queryRunner.query(`
// // // // // //       UPDATE "tenant"."ticket_requests"
// // // // // //       SET "current_step_code" = CASE "current_step_code"
// // // // // //         WHEN 'ORG_approve'      THEN 'org_approve'
// // // // // //         WHEN 'ORG_confirm'      THEN 'org_confirm'
// // // // // //         WHEN 'ORG_approve_pre'  THEN 'org_approve_pre'
// // // // // //         WHEN 'ORG_approve_post' THEN 'org_approve_post'
// // // // // //         ELSE "current_step_code"
// // // // // //       END
// // // // // //       WHERE "current_step_code" IN (
// // // // // //         'ORG_approve', 'ORG_confirm', 'ORG_approve_pre', 'ORG_approve_post'
// // // // // //       )
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Revert step code casing
// // // // // //     await queryRunner.query(`
// // // // // //       UPDATE "tenant"."ticket_requests"
// // // // // //       SET "current_step_code" = CASE "current_step_code"
// // // // // //         WHEN 'org_approve'      THEN 'ORG_approve'
// // // // // //         WHEN 'org_confirm'      THEN 'ORG_confirm'
// // // // // //         WHEN 'org_approve_pre'  THEN 'ORG_approve_pre'
// // // // // //         WHEN 'org_approve_post' THEN 'ORG_approve_post'
// // // // // //         ELSE "current_step_code"
// // // // // //       END
// // // // // //       WHERE "current_step_code" IN (
// // // // // //         'org_approve', 'org_confirm', 'org_approve_pre', 'org_approve_post'
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     // Note: PostgreSQL does not support DROP VALUE from enum.
// // // // // //     // pending_submission cannot be removed without recreating the type.
// // // // // //     // The _old type cleanup also cannot be reverted.
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 