// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddOrgProfileColumns1764100000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddOrgProfileColumns1764100000000 implements MigrationInterface {
// // // // // //   name = 'AddOrgProfileColumns1764100000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     const hasTable = await queryRunner.query(`
// // // // // //       SELECT EXISTS (
// // // // // //         SELECT 1 FROM information_schema.tables
// // // // // //         WHERE table_schema = 'tenant' AND table_name = 'organizations'
// // // // // //       ) AS exists
// // // // // //     `);
// // // // // //     if (!hasTable?.[0]?.exists) return;
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organizations"
// // // // // //         ADD COLUMN IF NOT EXISTS "contact_email" varchar(255) NULL,
// // // // // //         ADD COLUMN IF NOT EXISTS "timezone"      varchar(100) NULL,
// // // // // //         ADD COLUMN IF NOT EXISTS "website"       varchar(500) NULL
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     const hasTable = await queryRunner.query(`
// // // // // //       SELECT EXISTS (
// // // // // //         SELECT 1 FROM information_schema.tables
// // // // // //         WHERE table_schema = 'tenant' AND table_name = 'organizations'
// // // // // //       ) AS exists
// // // // // //     `);
// // // // // //     if (!hasTable?.[0]?.exists) return;
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organizations"
// // // // // //         DROP COLUMN IF EXISTS "contact_email",
// // // // // //         DROP COLUMN IF EXISTS "timezone",
// // // // // //         DROP COLUMN IF EXISTS "website"
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 