// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddInvitationMessageToOrganizationInvitations1765300000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddInvitationMessageToOrganizationInvitations1765300000000 implements MigrationInterface {
// // // // // //   name = 'AddInvitationMessageToOrganizationInvitations1765300000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     const hasTable = await queryRunner.query(`
// // // // // //       SELECT EXISTS (
// // // // // //         SELECT 1 FROM information_schema.tables
// // // // // //         WHERE table_schema = 'tenant' AND table_name = 'organization_invitations'
// // // // // //       ) AS exists
// // // // // //     `);
// // // // // //     if (!hasTable?.[0]?.exists) return;
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organization_invitations"
// // // // // //         ADD COLUMN IF NOT EXISTS "message" text NULL
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     const hasTable = await queryRunner.query(`
// // // // // //       SELECT EXISTS (
// // // // // //         SELECT 1 FROM information_schema.tables
// // // // // //         WHERE table_schema = 'tenant' AND table_name = 'organization_invitations'
// // // // // //       ) AS exists
// // // // // //     `);
// // // // // //     if (!hasTable?.[0]?.exists) return;
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."organization_invitations"
// // // // // //         DROP COLUMN IF EXISTS "message"
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 