// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: AddOtMetadataToTicketRequest1763000000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class AddOtMetadataToTicketRequest1763000000000 implements MigrationInterface {
// // // // // //   name = 'AddOtMetadataToTicketRequest1763000000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ADD COLUMN IF NOT EXISTS "ot_metadata" jsonb DEFAULT NULL
// // // // // //     `);
// // // // // // 
// // // // // //     const [{ exists: hasPermissionTable }] = await queryRunner.query(`
// // // // // //       SELECT EXISTS (
// // // // // //         SELECT 1 FROM information_schema.tables
// // // // // //         WHERE table_schema = 'rbac' AND table_name = 'permissions'
// // // // // //       ) AS exists
// // // // // //     `);
// // // // // // 
// // // // // //     if (hasPermissionTable) {
// // // // // //       await queryRunner.query(
// // // // // //         `
// // // // // //           INSERT INTO "rbac"."permissions" ("code", "name", "module", "description")
// // // // // //           VALUES ($1, 'create_overtime', 'ticket_requests', 'Create overtime ticket requests (PM role)')
// // // // // //           ON CONFLICT ("code") DO NOTHING
// // // // // //         `,
// // // // // //         ['ticket_requests.create_overtime'],
// // // // // //       );
// // // // // // 
// // // // // //       // Gán permission cho org_admin và system_admin roles (những role đã được seed trước đó)
// // // // // //       const [{ hasRolePermTable }] = await queryRunner.query(`
// // // // // //         SELECT EXISTS (
// // // // // //           SELECT 1 FROM information_schema.tables
// // // // // //           WHERE table_schema = 'rbac' AND table_name = 'role_permissions'
// // // // // //         ) AS "hasRolePermTable"
// // // // // //       `);
// // // // // // 
// // // // // //       if (hasRolePermTable) {
// // // // // //         await queryRunner.query(`
// // // // // //           INSERT INTO "rbac"."role_permissions" ("role_id", "permission_id")
// // // // // //           SELECT r.id, p.id
// // // // // //           FROM "rbac"."roles" r
// // // // // //           CROSS JOIN "rbac"."permissions" p
// // // // // //           WHERE r.name IN ('org_admin', 'system_admin')
// // // // // //             AND p.code = 'ticket_requests.create_overtime'
// // // // // //           ON CONFLICT DO NOTHING
// // // // // //         `);
// // // // // //       }
// // // // // //     }
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP COLUMN IF EXISTS "ot_metadata"
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DELETE FROM "rbac"."role_permissions"
// // // // // //       WHERE "permission_id" IN (
// // // // // //         SELECT id FROM "rbac"."permissions" WHERE "code" = 'ticket_requests.create_overtime'
// // // // // //       )
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DELETE FROM "rbac"."permissions"
// // // // // //       WHERE "code" = 'ticket_requests.create_overtime'
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 