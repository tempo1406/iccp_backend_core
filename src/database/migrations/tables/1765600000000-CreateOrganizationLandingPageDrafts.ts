// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: CreateOrganizationLandingPageDrafts1765600000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class CreateOrganizationLandingPageDrafts1765600000000 implements MigrationInterface {
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "tenant"."organization_landing_page_drafts" (
// // // // // //         "id"                  uuid         NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "organization_id"     uuid         NOT NULL,
// // // // // //         "user_id"             uuid         NOT NULL,
// // // // // //         "raw_html"            text,
// // // // // //         "project_data"        text,
// // // // // //         "ai_conversation"     jsonb        NOT NULL DEFAULT '[]'::jsonb,
// // // // // //         "current_template_id" uuid,
// // // // // //         "source"              varchar(32)  NOT NULL DEFAULT 'scratch',
// // // // // //         "pending_draft"       jsonb,
// // // // // //         "created_at"          timestamptz  NOT NULL DEFAULT now(),
// // // // // //         "updated_at"          timestamptz  NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "pk_org_lp_drafts" PRIMARY KEY ("id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE UNIQUE INDEX IF NOT EXISTS "uq_org_lp_drafts_org_user"
// // // // // //         ON "tenant"."organization_landing_page_drafts" ("organization_id", "user_id")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_org_lp_drafts_org_id"
// // // // // //         ON "tenant"."organization_landing_page_drafts" ("organization_id")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_org_lp_drafts_user_id"
// // // // // //         ON "tenant"."organization_landing_page_drafts" ("user_id")
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       DROP TABLE IF EXISTS "tenant"."organization_landing_page_drafts"
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 