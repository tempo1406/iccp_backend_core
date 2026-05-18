/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationLandingPageTemplates1765500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant"."organization_landing_page_templates" (
        "id"              uuid          NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid          NOT NULL,
        "name"            varchar(255)  NOT NULL DEFAULT 'Untitled Page',
        "html"            text,
        "project_data"    text,
        "thumbnail_url"   text,
        "created_at"      timestamptz   NOT NULL DEFAULT now(),
        "updated_at"      timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_org_lp_templates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_org_lp_templates_org_id"
        ON "tenant"."organization_landing_page_templates" ("organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "tenant"."organization_landing_page_templates"
    `);
  }
}

*/