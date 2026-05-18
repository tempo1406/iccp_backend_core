/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameProjectEmployeeRole1776520000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rbac.roles
      SET name = 'project_employee',
          description = 'Project employee role'
      WHERE name = 'employee'
        AND project_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rbac.roles
      SET name = 'employee'
      WHERE name = 'project_employee'
        AND project_id IS NOT NULL
    `);
  }
}


*/