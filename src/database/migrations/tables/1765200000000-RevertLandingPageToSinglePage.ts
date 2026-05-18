/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RevertLandingPageToSinglePage1765200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicate rows per org (keep the latest one) before restoring unique constraint
    await queryRunner.query(`
      DELETE FROM "tenant"."organization_landing_pages" lp
      WHERE lp.id NOT IN (
        SELECT DISTINCT ON (organization_id) id
        FROM "tenant"."organization_landing_pages"
        ORDER BY organization_id, created_at DESC
      )
    `);

    // Drop composite constraint if exists (as constraint)
    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      DROP CONSTRAINT IF EXISTS "uq_org_landing_pages_org_slug"
    `);

    // Also drop as standalone index in case TypeORM created it via @Index decorator
    await queryRunner.query(`
      DROP INDEX IF EXISTS "tenant"."uq_org_landing_pages_org_slug"
    `);

    // Drop slug and name columns
    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      DROP COLUMN IF EXISTS "slug"
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      DROP COLUMN IF EXISTS "name"
    `);

    // Restore unique constraint on organization_id alone
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'tenant'
            AND tablename  = 'organization_landing_pages'
            AND indexname  = 'uq_org_landing_pages_org_id'
        ) THEN
          ALTER TABLE "tenant"."organization_landing_pages"
          ADD CONSTRAINT "uq_org_landing_pages_org_id"
          UNIQUE ("organization_id");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      DROP CONSTRAINT IF EXISTS "uq_org_landing_pages_org_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      ADD COLUMN IF NOT EXISTS "name" varchar(255) NOT NULL DEFAULT 'Main Page'
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      ADD COLUMN IF NOT EXISTS "slug" varchar(255) NOT NULL DEFAULT 'index'
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_pages"
      ADD CONSTRAINT "uq_org_landing_pages_org_slug"
      UNIQUE ("organization_id", "slug")
    `);
  }
}

*/