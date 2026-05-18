/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTicketRequestApproverColumn1764300000000
  implements MigrationInterface
{
  name = 'RemoveTicketRequestApproverColumn1764300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant"."ticket_requests"
      DROP CONSTRAINT IF EXISTS "FK_ticket_requests_approver";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "tenant"."IDX_ticket_requests_org_approver";
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."ticket_requests"
      DROP COLUMN IF EXISTS "approver_id";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant"."ticket_requests"
      ADD COLUMN IF NOT EXISTS "approver_id" uuid;
    `);

    await queryRunner.query(`
      UPDATE "tenant"."ticket_requests"
      SET "approver_id" = "delegate_id"
      WHERE "approver_id" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant"."ticket_requests"
      ALTER COLUMN "approver_id" SET NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ticket_requests_org_approver"
      ON "tenant"."ticket_requests" ("organization_id", "approver_id");
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('auth.users') IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_requests_approver') THEN
          ALTER TABLE "tenant"."ticket_requests"
          ADD CONSTRAINT "FK_ticket_requests_approver"
          FOREIGN KEY ("approver_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `);
  }
}

*/