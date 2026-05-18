// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddProjectBudgetColumns1764500000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddProjectBudgetColumns1764500000000 implements MigrationInterface {
// // // // // //   name = 'AddProjectBudgetColumns1764500000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Create enum if not exists
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$ BEGIN
// // // // // //         CREATE TYPE "project"."project_budget_currency" AS ENUM ('USD', 'VND');
// // // // // //       EXCEPTION WHEN duplicate_object THEN NULL;
// // // // // //       END $$;
// // // // // //     `);
// // // // // // 
// // // // // //     // Add missing budget columns to project.projects
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "project"."projects"
// // // // // //         ADD COLUMN IF NOT EXISTS "estimated_budget" NUMERIC(15,2),
// // // // // //         ADD COLUMN IF NOT EXISTS "actual_budget"    NUMERIC(15,2),
// // // // // //         ADD COLUMN IF NOT EXISTS "budget_currency"  "project"."project_budget_currency" NOT NULL DEFAULT 'VND'
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "project"."projects"
// // // // // //         DROP COLUMN IF EXISTS "estimated_budget",
// // // // // //         DROP COLUMN IF EXISTS "actual_budget",
// // // // // //         DROP COLUMN IF EXISTS "budget_currency"
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TYPE IF EXISTS "project"."project_budget_currency"`,
// // // // // //     );
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 