/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationLandingPages1765000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant"."organization_landing_pages" (
        "id"              uuid        NOT NULL DEFAULT gen_random_uuid(),
        "organization_id" uuid        NOT NULL,
        "blocks"          jsonb       NOT NULL DEFAULT '[]',
        "is_published"    boolean     NOT NULL DEFAULT false,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_org_landing_pages" PRIMARY KEY ("id"),
        CONSTRAINT "uq_org_landing_pages_org_id" UNIQUE ("organization_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_org_landing_pages_org_id"
        ON "tenant"."organization_landing_pages" ("organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "tenant"."organization_landing_pages"
    `);
  }
}

*/