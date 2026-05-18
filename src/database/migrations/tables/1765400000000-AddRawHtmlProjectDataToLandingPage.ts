// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddRawHtmlProjectDataToLandingPage1765400000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddRawHtmlProjectDataToLandingPage1765400000000 implements MigrationInterface {
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     // Add raw_html column
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organization_landing_pages"
// // // // // //       ADD COLUMN IF NOT EXISTS "raw_html" text
// // // // // //     `);
// // // // // // 
// // // // // //     // Add project_data column
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organization_landing_pages"
// // // // // //       ADD COLUMN IF NOT EXISTS "project_data" text
// // // // // //     `);
// // // // // // 
// // // // // //     // Migrate existing data: if blocks contains a single custom_html block,
// // // // // //     // copy its html content into raw_html
// // // // // //     await queryRunner.query(`
// // // // // //       UPDATE "tenant"."organization_landing_pages"
// // // // // //       SET raw_html = (blocks->0->'props'->>'html')
// // // // // //       WHERE jsonb_array_length(blocks) = 1
// // // // // //         AND blocks->0->>'type' = 'custom_html'
// // // // // //         AND (blocks->0->'props'->>'html') IS NOT NULL
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organization_landing_pages"
// // // // // //       DROP COLUMN IF EXISTS "raw_html"
// // // // // //     `);
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organization_landing_pages"
// // // // // //       DROP COLUMN IF EXISTS "project_data"
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 