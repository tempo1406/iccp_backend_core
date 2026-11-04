/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiPageToOrganizationLandingPages1765100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add name column
    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      ADD COLUMN IF NOT EXISTS "name" varchar(255) NOT NULL DEFAULT 'Main Page'
    `);

    // Add slug column
    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      ADD COLUMN IF NOT EXISTS "slug" varchar(255) NOT NULL DEFAULT 'index'
    `);

    // Drop old unique constraint on organization_id alone
    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      DROP CONSTRAINT IF EXISTS "uq_org_landing_pages_org_id"
    `);

    // Add composite unique constraint (organization_id, slug) — skip if index already exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'tenant'
            AND tablename  = 'organization_landing_pages'
            AND indexname  = 'uq_org_landing_pages_org_slug'
        ) THEN
          ALTER TABLE "tenant"."organization_landing_pages"
          ADD CONSTRAINT "uq_org_landing_pages_org_slug"
          UNIQUE ("organization_id", "slug");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      DROP CONSTRAINT IF EXISTS "uq_org_landing_pages_org_slug"
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      ADD CONSTRAINT "uq_org_landing_pages_org_id"
      UNIQUE ("organization_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      DROP COLUMN IF EXISTS "slug"
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      DROP COLUMN IF EXISTS "name"
    `);
  }
}

*/