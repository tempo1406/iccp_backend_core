/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseBillingMoneyPrecision1777085000000
  implements MigrationInterface
{
  name = 'IncreaseBillingMoneyPrecision1777085000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "billing"."subscription_plans"
        ALTER COLUMN "price_monthly" TYPE DECIMAL(12, 2),
        ALTER COLUMN "price_yearly" TYPE DECIMAL(12, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "billing"."invoices"
        ALTER COLUMN "amount" TYPE DECIMAL(12, 2),
        ALTER COLUMN "tax_amount" TYPE DECIMAL(12, 2),
        ALTER COLUMN "total_amount" TYPE DECIMAL(12, 2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "billing"."invoices"
        ALTER COLUMN "amount" TYPE DECIMAL(10, 2),
        ALTER COLUMN "tax_amount" TYPE DECIMAL(10, 2),
        ALTER COLUMN "total_amount" TYPE DECIMAL(10, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "billing"."subscription_plans"
        ALTER COLUMN "price_monthly" TYPE DECIMAL(10, 2),
        ALTER COLUMN "price_yearly" TYPE DECIMAL(10, 2)
    `);
  }
}

*/