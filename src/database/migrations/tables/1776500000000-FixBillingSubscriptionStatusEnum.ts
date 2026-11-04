// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: FixBillingSubscriptionStatusEnum1776500000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class FixBillingSubscriptionStatusEnum1776500000000 implements MigrationInterface {
// // // // // //   name = 'FixBillingSubscriptionStatusEnum1776500000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Ensure pending_payment exists in billing.subscriptions_status_enum.
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF EXISTS (
// // // // // //           SELECT 1
// // // // // //           FROM pg_type t
// // // // // //           JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE n.nspname = 'billing'
// // // // // //             AND t.typname = 'subscriptions_status_enum'
// // // // // //         ) THEN
// // // // // //           IF NOT EXISTS (
// // // // // //             SELECT 1
// // // // // //             FROM pg_enum e
// // // // // //             JOIN pg_type t ON t.oid = e.enumtypid
// // // // // //             JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //             WHERE n.nspname = 'billing'
// // // // // //               AND t.typname = 'subscriptions_status_enum'
// // // // // //               AND e.enumlabel = 'pending_payment'
// // // // // //           ) THEN
// // // // // //             ALTER TYPE "billing"."subscriptions_status_enum"
// // // // // //             ADD VALUE 'pending_payment';
// // // // // //           END IF;
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // // 
// // // // // //     // Backfill old pending -> pending_payment when both labels exist.
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF EXISTS (
// // // // // //           SELECT 1
// // // // // //           FROM pg_type t
// // // // // //           JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE n.nspname = 'billing'
// // // // // //             AND t.typname = 'subscriptions_status_enum'
// // // // // //         ) THEN
// // // // // //           IF EXISTS (
// // // // // //             SELECT 1
// // // // // //             FROM pg_enum e
// // // // // //             JOIN pg_type t ON t.oid = e.enumtypid
// // // // // //             JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //             WHERE n.nspname = 'billing'
// // // // // //               AND t.typname = 'subscriptions_status_enum'
// // // // // //               AND e.enumlabel = 'pending'
// // // // // //           ) AND EXISTS (
// // // // // //             SELECT 1
// // // // // //             FROM pg_enum e
// // // // // //             JOIN pg_type t ON t.oid = e.enumtypid
// // // // // //             JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //             WHERE n.nspname = 'billing'
// // // // // //               AND t.typname = 'subscriptions_status_enum'
// // // // // //               AND e.enumlabel = 'pending_payment'
// // // // // //           ) THEN
// // // // // //             UPDATE "billing"."subscriptions"
// // // // // //             SET "status" = 'pending_payment'
// // // // // //             WHERE "status"::text = 'pending';
// // // // // //           END IF;
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(): Promise<void> {
// // // // // //     // No-op: PostgreSQL does not support dropping enum labels safely.
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 