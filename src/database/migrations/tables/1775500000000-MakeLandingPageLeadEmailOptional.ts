/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeLandingPageLeadEmailOptional1775500000000
  implements MigrationInterface
{
  name = 'MakeLandingPageLeadEmailOptional1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_page_leads"
      ALTER COLUMN "email" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tenant"."organization_landing_page_leads"
      SET "email" = ''
      WHERE "email" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."organization_landing_page_leads"
      ALTER COLUMN "email" SET NOT NULL
    `);
  }
}

*/