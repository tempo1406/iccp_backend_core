/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateOvertimeStandardToStandardDirect1763200000000
  implements MigrationInterface
{
  name = 'MigrateOvertimeStandardToStandardDirect1763200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop default before altering column type
    await queryRunner.query(`
      ALTER TABLE "tenant"."ticket_requests"
      ALTER COLUMN "workflow_code" DROP DEFAULT;
    `);

    // 2. Recreate enum without 'overtime_standard'
    await queryRunner.query(`
      ALTER TYPE "tenant"."ticket_request_workflow_code"
      RENAME TO "ticket_request_workflow_code_old";
    `);

    await queryRunner.query(`
      CREATE TYPE "tenant"."ticket_request_workflow_code" AS ENUM (
        'working_time',
        'overtime_opic',
        'overtime_standard_direct'
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."ticket_requests"
      ALTER COLUMN "workflow_code"
      TYPE "tenant"."ticket_request_workflow_code"
      USING (
        CASE
          WHEN "workflow_code"::text = 'overtime_standard'
            THEN 'overtime_standard_direct'
          ELSE "workflow_code"::text
        END
      )::"tenant"."ticket_request_workflow_code";
    `);

    await queryRunner.query(`
      DROP TYPE "tenant"."ticket_request_workflow_code_old";
    `);

    // 3. Restore default
    await queryRunner.query(`
      ALTER TABLE "tenant"."ticket_requests"
      ALTER COLUMN "workflow_code" SET DEFAULT 'working_time';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant"."ticket_requests"
      ALTER COLUMN "workflow_code" DROP DEFAULT;
    `);

    await queryRunner.query(`
      ALTER TYPE "tenant"."ticket_request_workflow_code"
      RENAME TO "ticket_request_workflow_code_old";
    `);

    await queryRunner.query(`
      CREATE TYPE "tenant"."ticket_request_workflow_code" AS ENUM (
        'working_time',
        'overtime_opic',
        'overtime_standard',
        'overtime_standard_direct'
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."ticket_requests"
      ALTER COLUMN "workflow_code"
      TYPE "tenant"."ticket_request_workflow_code"
      USING "workflow_code"::text::"tenant"."ticket_request_workflow_code";
    `);

    await queryRunner.query(`
      DROP TYPE "tenant"."ticket_request_workflow_code_old";
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."ticket_requests"
      ALTER COLUMN "workflow_code" SET DEFAULT 'working_time';
    `);
  }
}

*/