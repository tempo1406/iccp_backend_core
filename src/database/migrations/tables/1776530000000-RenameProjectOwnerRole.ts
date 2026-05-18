/*

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameProjectOwnerRole1776530000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rbac.roles
      SET name = 'project_owner',
          description = 'Project owner role'
      WHERE name = 'owner'
        AND project_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE rbac.roles
      SET name = 'owner',
          description = 'Project owner role'
      WHERE name = 'project_owner'
        AND project_id IS NOT NULL
    `);
  }

}
*/