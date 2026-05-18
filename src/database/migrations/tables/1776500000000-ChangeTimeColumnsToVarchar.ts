/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeTimeColumnsToVarchar1776500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'project'
            AND table_name = 'project_configs'
            AND column_name = 'daily_time'
        ) THEN
          ALTER TABLE project.project_configs
            ALTER COLUMN daily_time TYPE varchar(5)
            USING SUBSTR(daily_time::text, 1, 5);
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'project'
            AND table_name = 'project_configs'
            AND column_name = 'weekly_time'
        ) THEN
          ALTER TABLE project.project_configs
            ALTER COLUMN weekly_time TYPE varchar(5)
            USING SUBSTR(weekly_time::text, 1, 5);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'project'
            AND table_name = 'project_configs'
            AND column_name = 'daily_time'
        ) THEN
          ALTER TABLE project.project_configs
            ALTER COLUMN daily_time TYPE time
            USING daily_time::time;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'project'
            AND table_name = 'project_configs'
            AND column_name = 'weekly_time'
        ) THEN
          ALTER TABLE project.project_configs
            ALTER COLUMN weekly_time TYPE time
            USING weekly_time::time;
        END IF;
      END $$;
    `);
  }
}

*/