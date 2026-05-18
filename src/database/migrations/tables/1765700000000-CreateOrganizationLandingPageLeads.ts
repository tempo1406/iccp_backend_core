// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: CreateOrganizationLandingPageLeads1765700000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class CreateOrganizationLandingPageLeads1765700000000 implements MigrationInterface {
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "tenant"."organization_landing_page_leads" (
// // // // // //         "id"              uuid          NOT NULL DEFAULT gen_random_uuid(),
// // // // // //         "organization_id" uuid          NOT NULL,
// // // // // //         "landing_page_id" uuid,
// // // // // //         "form_type"       varchar(100)  NOT NULL DEFAULT 'lead',
// // // // // //         "form_name"       varchar(255),
// // // // // //         "full_name"       varchar(255),
// // // // // //         "email"           varchar(255)  NOT NULL,
// // // // // //         "phone"           varchar(50),
// // // // // //         "message"         text,
// // // // // //         "page_url"        text,
// // // // // //         "fields"          jsonb,
// // // // // //         "submitted_at"    timestamptz,
// // // // // //         "created_at"      timestamptz   NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "pk_org_lp_leads" PRIMARY KEY ("id")
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_org_lp_leads_org_id"
// // // // // //         ON "tenant"."organization_landing_page_leads" ("organization_id")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_org_lp_leads_page_id"
// // // // // //         ON "tenant"."organization_landing_page_leads" ("landing_page_id")
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "idx_org_lp_leads_submitted_at"
// // // // // //         ON "tenant"."organization_landing_page_leads" ("submitted_at")
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       DROP TABLE IF EXISTS "tenant"."organization_landing_page_leads"
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 