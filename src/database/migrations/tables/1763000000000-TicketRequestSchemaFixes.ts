/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class TicketRequestSchemaFixes1763000000000
  implements MigrationInterface
{
  name = 'TicketRequestSchemaFixes1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add pending_submission to ticket_request_status enum
    await queryRunner.query(`
      ALTER TYPE "tenant"."ticket_request_status"
      ADD VALUE IF NOT EXISTS 'pending_submission';
    `);

    // 2. Fix ORG_* step code casing in current_step_code column
    await queryRunner.query(`
      UPDATE "tenant"."ticket_requests"
      SET "current_step_code" = CASE "current_step_code"
        WHEN 'ORG_approve'     THEN 'org_approve'
        WHEN 'ORG_confirm'     THEN 'org_confirm'
        WHEN 'ORG_approve_pre' THEN 'org_approve_pre'
        WHEN 'ORG_approve_post' THEN 'org_approve_post'
        ELSE "current_step_code"
      END
      WHERE "current_step_code" IN (
        'ORG_approve', 'ORG_confirm', 'ORG_approve_pre', 'ORG_approve_post'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert step code casing
    await queryRunner.query(`
      UPDATE "tenant"."ticket_requests"
      SET "current_step_code" = CASE "current_step_code"
        WHEN 'org_approve'      THEN 'ORG_approve'
        WHEN 'org_confirm'      THEN 'ORG_confirm'
        WHEN 'org_approve_pre'  THEN 'ORG_approve_pre'
        WHEN 'org_approve_post' THEN 'ORG_approve_post'
        ELSE "current_step_code"
      END
      WHERE "current_step_code" IN (
        'org_approve', 'org_confirm', 'org_approve_pre', 'org_approve_post'
      );
    `);

    // PostgreSQL does not support DROP VALUE from enum — pending_submission cannot be removed automatically.
  }
}

*/