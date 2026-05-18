// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddLandingPageTemplateNameLengthConstraint1765900000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddLandingPageTemplateNameLengthConstraint1765900000000 implements MigrationInterface {
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organization_landing_page_templates"
// // // // // //       DROP CONSTRAINT IF EXISTS "chk_org_lp_templates_name_length"
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organization_landing_page_templates"
// // // // // //       ADD CONSTRAINT "chk_org_lp_templates_name_length"
// // // // // //       CHECK (char_length("name") <= 30)
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organization_landing_page_templates"
// // // // // //       DROP CONSTRAINT IF EXISTS "chk_org_lp_templates_name_length"
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 