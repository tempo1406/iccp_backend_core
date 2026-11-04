// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: GrantCreateOvertimeToOrgAdmin1763100000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class GrantCreateOvertimeToOrgAdmin1763100000000 implements MigrationInterface {
// // // // // //   name = 'GrantCreateOvertimeToOrgAdmin1763100000000';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     const hasTable = await queryRunner.query(`
// // // // // //       SELECT EXISTS (
// // // // // //         SELECT 1 FROM information_schema.tables
// // // // // //         WHERE table_schema = 'rbac' AND table_name = 'role_permissions'
// // // // // //       ) AS exists
// // // // // //     `);
// // // // // //     if (!hasTable?.[0]?.exists) return;
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       INSERT INTO "rbac"."role_permissions" ("role_id", "permission_id")
// // // // // //       SELECT r.id, p.id
// // // // // //       FROM "rbac"."roles" r
// // // // // //       CROSS JOIN "rbac"."permissions" p
// // // // // //       WHERE r.name IN ('org_admin', 'system_admin')
// // // // // //         AND p.code = 'ticket_requests.create_overtime'
// // // // // //       ON CONFLICT DO NOTHING
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     const hasTable = await queryRunner.query(`
// // // // // //       SELECT EXISTS (
// // // // // //         SELECT 1 FROM information_schema.tables
// // // // // //         WHERE table_schema = 'rbac' AND table_name = 'role_permissions'
// // // // // //       ) AS exists
// // // // // //     `);
// // // // // //     if (!hasTable?.[0]?.exists) return;
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DELETE FROM "rbac"."role_permissions"
// // // // // //       WHERE "permission_id" IN (
// // // // // //         SELECT id FROM "rbac"."permissions"
// // // // // //         WHERE "code" = 'ticket_requests.create_overtime'
// // // // // //       )
// // // // // //       AND "role_id" IN (
// // // // // //         SELECT id FROM "rbac"."roles"
// // // // // //         WHERE "name" IN ('org_admin', 'system_admin')
// // // // // //       )
// // // // // //     `);
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 