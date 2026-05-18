// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: UpdateTicketRequestDelegateWorkflow1762000000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class UpdateTicketRequestDelegateWorkflow1762000000000 implements MigrationInterface {
// // // // // //   name = 'UpdateTicketRequestDelegateWorkflow1762000000000';
// // // // // // 
// // // // // //   private readonly delegatePermission = 'ticket_requests.delegate';
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     const hasPermissionTable = await queryRunner.hasTable('rbac.permissions');
// // // // // //     const hasRoleTable = await queryRunner.hasTable('rbac.roles');
// // // // // //     const hasRolePermissionTable = await queryRunner.hasTable(
// // // // // //       'rbac.role_permissions',
// // // // // //     );
// // // // // // 
// // // // // //     if (hasPermissionTable) {
// // // // // //       await queryRunner.query(
// // // // // //         `
// // // // // //           INSERT INTO "rbac"."permissions" ("code", "name", "module", "description")
// // // // // //           VALUES ($1, 'delegate', 'ticket_requests', 'Permission for ticket requests delegate approval')
// // // // // //           ON CONFLICT ("code") DO NOTHING;
// // // // // //         `,
// // // // // //         [this.delegatePermission],
// // // // // //       );
// // // // // //     }
// // // // // // 
// // // // // //     if (hasPermissionTable && hasRoleTable && hasRolePermissionTable) {
// // // // // //       const hasIsSystemRoleColumn = await queryRunner.hasColumn(
// // // // // //         'rbac.roles',
// // // // // //         'is_system_role',
// // // // // //       );
// // // // // // 
// // // // // //       await queryRunner.query(
// // // // // //         `
// // // // // //           INSERT INTO "rbac"."role_permissions" ("role_id", "permission_id")
// // // // // //           SELECT r.id, p.id
// // // // // //           FROM "rbac"."roles" r
// // // // // //           INNER JOIN "rbac"."permissions" p ON p.code = $1
// // // // // //           WHERE r.name IN ('system_admin', 'org_admin')
// // // // // //           ${hasIsSystemRoleColumn ? 'AND r.is_system_role = true' : ''}
// // // // // //           ON CONFLICT ("role_id", "permission_id") DO NOTHING;
// // // // // //         `,
// // // // // //         [this.delegatePermission],
// // // // // //       );
// // // // // //     }
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ADD COLUMN IF NOT EXISTS "delegate_id" uuid;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       UPDATE "tenant"."ticket_requests"
// // // // // //       SET "delegate_id" = "approver_id"
// // // // // //       WHERE "delegate_id" IS NULL;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ALTER COLUMN "delegate_id" SET NOT NULL;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_ticket_requests_org_delegate"
// // // // // //       ON "tenant"."ticket_requests" ("organization_id", "delegate_id");
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF to_regclass('auth.users') IS NOT NULL
// // // // // //           AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_requests_delegate') THEN
// // // // // //           ALTER TABLE "tenant"."ticket_requests"
// // // // // //           ADD CONSTRAINT "FK_ticket_requests_delegate"
// // // // // //           FOREIGN KEY ("delegate_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP COLUMN IF EXISTS "priority";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF EXISTS (
// // // // // //           SELECT 1
// // // // // //           FROM pg_type t
// // // // // //           JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE t.typname = 'ticket_request_priority'
// // // // // //             AND n.nspname = 'tenant'
// // // // // //         ) THEN
// // // // // //           BEGIN
// // // // // //             DROP TYPE "tenant"."ticket_request_priority";
// // // // // //           EXCEPTION
// // // // // //             WHEN dependent_objects_still_exist THEN
// // // // // //               NULL;
// // // // // //           END;
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     const hasRolePermissionTable = await queryRunner.hasTable(
// // // // // //       'rbac.role_permissions',
// // // // // //     );
// // // // // //     const hasPermissionTable = await queryRunner.hasTable('rbac.permissions');
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1
// // // // // //           FROM pg_type t
// // // // // //           JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE t.typname = 'ticket_request_priority'
// // // // // //             AND n.nspname = 'tenant'
// // // // // //         ) THEN
// // // // // //           CREATE TYPE "tenant"."ticket_request_priority" AS ENUM (
// // // // // //             'low',
// // // // // //             'normal',
// // // // // //             'high'
// // // // // //           );
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       ADD COLUMN IF NOT EXISTS "priority" "tenant"."ticket_request_priority" NOT NULL DEFAULT 'normal';
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP CONSTRAINT IF EXISTS "FK_ticket_requests_delegate";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DROP INDEX IF EXISTS "tenant"."IDX_ticket_requests_org_delegate";
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       ALTER TABLE "tenant"."ticket_requests"
// // // // // //       DROP COLUMN IF EXISTS "delegate_id";
// // // // // //     `);
// // // // // // 
// // // // // //     if (hasRolePermissionTable && hasPermissionTable) {
// // // // // //       await queryRunner.query(
// // // // // //         `
// // // // // //           DELETE FROM "rbac"."role_permissions"
// // // // // //           WHERE "permission_id" IN (
// // // // // //             SELECT "id"
// // // // // //             FROM "rbac"."permissions"
// // // // // //             WHERE "code" = $1
// // // // // //           );
// // // // // //         `,
// // // // // //         [this.delegatePermission],
// // // // // //       );
// // // // // //     }
// // // // // // 
// // // // // //     if (hasPermissionTable) {
// // // // // //       await queryRunner.query(
// // // // // //         `
// // // // // //           DELETE FROM "rbac"."permissions"
// // // // // //           WHERE "code" = $1;
// // // // // //         `,
// // // // // //         [this.delegatePermission],
// // // // // //       );
// // // // // //     }
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 