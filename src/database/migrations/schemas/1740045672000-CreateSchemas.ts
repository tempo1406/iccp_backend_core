import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchemas1740045672000 implements MigrationInterface {
  name = 'CreateSchemas1740045672000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "rbac"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "tenant"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "auth"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "knowledge"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "chatbot"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "project"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "billing"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "analytics"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "system"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS "rbac" CASCADE`);
  }
}
