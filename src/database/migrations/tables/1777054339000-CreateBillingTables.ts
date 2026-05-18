// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: CreateBillingTables1777054339000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class CreateBillingTables1777054339000 implements MigrationInterface {
// // // // // //   name = 'CreateBillingTables1777054339000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Ensure billing schema exists
// // // // // //     await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "billing"`);
// // // // // // 
// // // // // //     // Create enum types (safe: skip if already exists from synchronize)
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE n.nspname = 'billing' AND t.typname = 'subscriptions_status_enum'
// // // // // //         ) THEN
// // // // // //           CREATE TYPE "billing"."subscriptions_status_enum" AS ENUM('active', 'pending_payment', 'cancelled', 'expired', 'trial');
// // // // // //         END IF;
// // // // // //       END $$;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE n.nspname = 'billing' AND t.typname = 'invoices_status_enum'
// // // // // //         ) THEN
// // // // // //           CREATE TYPE "billing"."invoices_status_enum" AS ENUM('pending', 'paid', 'overdue', 'cancelled');
// // // // // //         END IF;
// // // // // //       END $$;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE n.nspname = 'billing' AND t.typname = 'payment_methods_type_enum'
// // // // // //         ) THEN
// // // // // //           CREATE TYPE "billing"."payment_methods_type_enum" AS ENUM('credit_card', 'bank_transfer', 'e_wallet');
// // // // // //         END IF;
// // // // // //       END $$;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE n.nspname = 'billing' AND t.typname = 'payment_transactions_status_enum'
// // // // // //         ) THEN
// // // // // //           CREATE TYPE "billing"."payment_transactions_status_enum" AS ENUM('pending', 'paid', 'cancelled', 'refunded', 'failed');
// // // // // //         END IF;
// // // // // //       END $$;
// // // // // //     `);
// // // // // // 
// // // // // //     // subscription_plans
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "billing"."subscription_plans" (
// // // // // //         "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
// // // // // //         "name" VARCHAR(100) NOT NULL,
// // // // // //         "code" VARCHAR(50) NOT NULL UNIQUE,
// // // // // //         "description" TEXT NULL,
// // // // // //         "price_monthly" DECIMAL(12, 2) NOT NULL,
// // // // // //         "price_yearly" DECIMAL(12, 2) NOT NULL,
// // // // // //         "max_users" INT NULL,
// // // // // //         "max_documents" INT NULL,
// // // // // //         "max_storage_gb" INT NULL,
// // // // // //         "max_projects" INT NULL,
// // // // // //         "features" JSONB NULL,
// // // // // //         "trial_days" INT NOT NULL DEFAULT 0,
// // // // // //         "is_active" BOOLEAN NOT NULL DEFAULT true,
// // // // // //         "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// // // // // //         "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     // subscriptions
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "billing"."subscriptions" (
// // // // // //         "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
// // // // // //         "organization_id" UUID NOT NULL,
// // // // // //         "plan_id" UUID NOT NULL,
// // // // // //         "status" "billing"."subscriptions_status_enum" NOT NULL DEFAULT 'active',
// // // // // //         "billing_cycle" VARCHAR(20) NULL,
// // // // // //         "start_date" DATE NULL,
// // // // // //         "end_date" DATE NULL,
// // // // // //         "trial_ends_at" TIMESTAMPTZ NULL,
// // // // // //         "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// // // // // //         "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     // invoices
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "billing"."invoices" (
// // // // // //         "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
// // // // // //         "organization_id" UUID NOT NULL,
// // // // // //         "subscription_id" UUID NOT NULL,
// // // // // //         "invoice_number" VARCHAR(50) NOT NULL UNIQUE,
// // // // // //         "amount" DECIMAL(12, 2) NOT NULL,
// // // // // //         "tax_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
// // // // // //         "total_amount" DECIMAL(12, 2) NOT NULL,
// // // // // //         "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
// // // // // //         "status" "billing"."invoices_status_enum" NOT NULL DEFAULT 'pending',
// // // // // //         "issue_date" DATE NOT NULL,
// // // // // //         "due_date" DATE NOT NULL,
// // // // // //         "paid_at" TIMESTAMPTZ NULL,
// // // // // //         "payment_method" VARCHAR(50) NULL,
// // // // // //         "payment_reference" VARCHAR(255) NULL,
// // // // // //         "notes" TEXT NULL,
// // // // // //         "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// // // // // //         "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     // payment_methods
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "billing"."payment_methods" (
// // // // // //         "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
// // // // // //         "organization_id" UUID NOT NULL,
// // // // // //         "type" "billing"."payment_methods_type_enum" NOT NULL,
// // // // // //         "details" JSONB NOT NULL,
// // // // // //         "is_default" BOOLEAN NOT NULL DEFAULT false,
// // // // // //         "is_active" BOOLEAN NOT NULL DEFAULT true,
// // // // // //         "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// // // // // //         "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     // payment_transactions
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "billing"."payment_transactions" (
// // // // // //         "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
// // // // // //         "organization_id" UUID NOT NULL,
// // // // // //         "subscription_id" UUID NULL,
// // // // // //         "invoice_id" UUID NULL,
// // // // // //         "order_code" BIGINT NOT NULL UNIQUE,
// // // // // //         "amount" DECIMAL(12, 2) NOT NULL,
// // // // // //         "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
// // // // // //         "description" VARCHAR(500) NULL,
// // // // // //         "status" "billing"."payment_transactions_status_enum" NOT NULL DEFAULT 'pending',
// // // // // //         "payos_response" JSONB NULL,
// // // // // //         "checkout_url" VARCHAR(500) NULL,
// // // // // //         "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// // // // // //         "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     // Create indexes
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_subscriptions_organization_id"
// // // // // //       ON "billing"."subscriptions"("organization_id")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_subscriptions_plan_id"
// // // // // //       ON "billing"."subscriptions"("plan_id")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_invoices_organization_id"
// // // // // //       ON "billing"."invoices"("organization_id")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_invoices_subscription_id"
// // // // // //       ON "billing"."invoices"("subscription_id")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_payment_methods_organization_id"
// // // // // //       ON "billing"."payment_methods"("organization_id")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_payment_transactions_organization_id"
// // // // // //       ON "billing"."payment_transactions"("organization_id")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_payment_transactions_subscription_id"
// // // // // //       ON "billing"."payment_transactions"("subscription_id")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_payment_transactions_invoice_id"
// // // // // //       ON "billing"."payment_transactions"("invoice_id")
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Drop tables
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "billing"."payment_transactions"`);
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "billing"."payment_methods"`);
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "billing"."invoices"`);
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "billing"."subscriptions"`);
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "billing"."subscription_plans"`);
// // // // // // 
// // // // // //     // Drop enum types
// // // // // //     await queryRunner.query(`DROP TYPE IF EXISTS "billing"."payment_transactions_status_enum"`);
// // // // // //     await queryRunner.query(`DROP TYPE IF EXISTS "billing"."payment_methods_type_enum"`);
// // // // // //     await queryRunner.query(`DROP TYPE IF EXISTS "billing"."invoices_status_enum"`);
// // // // // //     await queryRunner.query(`DROP TYPE IF EXISTS "billing"."subscriptions_status_enum"`);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 