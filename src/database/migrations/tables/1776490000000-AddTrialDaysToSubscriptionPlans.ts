/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrialDaysToSubscriptionPlans1776490000000
  implements MigrationInterface
{
  name = 'AddTrialDaysToSubscriptionPlans1776490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "billing"."subscription_plans"
      ADD COLUMN IF NOT EXISTS "trial_days" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "billing"."subscription_plans"
      DROP COLUMN IF EXISTS "trial_days"
    `);
  }
}

*/