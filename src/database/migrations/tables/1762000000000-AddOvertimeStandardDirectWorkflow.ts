/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOvertimeStandardDirectWorkflow1762000000000
  implements MigrationInterface
{
  name = 'AddOvertimeStandardDirectWorkflow1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "tenant"."ticket_request_workflow_code"
      ADD VALUE IF NOT EXISTS 'overtime_standard_direct';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL không hỗ trợ DROP VALUE từ enum.
    // Để rollback: xóa các record dùng workflow này trước, sau đó recreate enum.
  }
}

*/