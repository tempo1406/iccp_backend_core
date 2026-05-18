import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatSchema1776852600000 implements MigrationInterface {
  name = 'CreateChatSchema1776852600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "chat"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS "chat" CASCADE`);
  }
}
