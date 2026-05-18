// // // // // // import { MigrationInterface, QueryRunner } from 'typeorm';
// // // // // // 
// // // // // // /**
// // // // // //  * Migration: CreateTicketRequestTables1760000000000
// // // // // //  * Applies database schema/data changes with reversible up/down methods.
// // // // // //  */
// // // // // // export class CreateTicketRequestTables1760000000000 implements MigrationInterface {
// // // // // //   name = 'CreateTicketRequestTables1760000000000';
// // // // // // 
// // // // // //   private readonly allTicketPermissions = [
// // // // // //     'ticket_requests.create',
// // // // // //     'ticket_requests.list_org',
// // // // // //     'ticket_requests.view',
// // // // // //     'ticket_requests.update_own',
// // // // // //     'ticket_requests.cancel_own',
// // // // // //     'ticket_requests.approve',
// // // // // //     'ticket_requests.comment',
// // // // // //   ];
// // // // // // 
// // // // // //   private readonly userTicketPermissions = [
// // // // // //     'ticket_requests.create',
// // // // // //     'ticket_requests.view',
// // // // // //     'ticket_requests.update_own',
// // // // // //     'ticket_requests.cancel_own',
// // // // // //     'ticket_requests.comment',
// // // // // //   ];
// // // // // // 
// // // // // //   public async up(queryRunner: QueryRunner): Promise<void> {
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1
// // // // // //           FROM pg_type t
// // // // // //           JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE t.typname = 'ticket_request_type'
// // // // // //             AND n.nspname = 'tenant'
// // // // // //         ) THEN
// // // // // //           CREATE TYPE "tenant"."ticket_request_type" AS ENUM (
// // // // // //             'leave',
// // // // // //             'wfh',
// // // // // //             'overtime',
// // // // // //             'advance',
// // // // // //             'general'
// // // // // //           );
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1
// // // // // //           FROM pg_type t
// // // // // //           JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE t.typname = 'ticket_request_status'
// // // // // //             AND n.nspname = 'tenant'
// // // // // //         ) THEN
// // // // // //           CREATE TYPE "tenant"."ticket_request_status" AS ENUM (
// // // // // //             'pending_approval',
// // // // // //             'changes_requested',
// // // // // //             'approved',
// // // // // //             'rejected',
// // // // // //             'canceled'
// // // // // //           );
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
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
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF NOT EXISTS (
// // // // // //           SELECT 1
// // // // // //           FROM pg_type t
// // // // // //           JOIN pg_namespace n ON n.oid = t.typnamespace
// // // // // //           WHERE t.typname = 'ticket_request_activity_action'
// // // // // //             AND n.nspname = 'tenant'
// // // // // //         ) THEN
// // // // // //           CREATE TYPE "tenant"."ticket_request_activity_action" AS ENUM (
// // // // // //             'created',
// // // // // //             'submitted',
// // // // // //             'updated',
// // // // // //             'approved',
// // // // // //             'rejected',
// // // // // //             'changes_requested',
// // // // // //             'canceled',
// // // // // //             'commented',
// // // // // //             'cc_added',
// // // // // //             'cc_removed'
// // // // // //           );
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // // 
// // // // // //     // NOTE:
// // // // // //     // This codebase currently relies on synchronize=true for core table creation.
// // // // // //     // Migrations run before synchronize, so we create ticket tables without hard FK
// // // // // //     // dependency to tenant.organizations/auth.users and add those FKs conditionally.
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "tenant"."ticket_requests" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "organization_id" uuid NOT NULL,
// // // // // //         "code" varchar(40) NOT NULL,
// // // // // //         "type" "tenant"."ticket_request_type" NOT NULL,
// // // // // //         "title" varchar(255) NOT NULL,
// // // // // //         "content" text NOT NULL,
// // // // // //         "requester_id" uuid NOT NULL,
// // // // // //         "approver_id" uuid NOT NULL,
// // // // // //         "status" "tenant"."ticket_request_status" NOT NULL DEFAULT 'pending_approval',
// // // // // //         "priority" "tenant"."ticket_request_priority" NOT NULL DEFAULT 'normal',
// // // // // //         "start_at" timestamp NULL,
// // // // // //         "end_at" timestamp NULL,
// // // // // //         "decision_note" text NULL,
// // // // // //         "decided_at" timestamp NULL,
// // // // // //         "decided_by" uuid NULL,
// // // // // //         "canceled_at" timestamp NULL,
// // // // // //         "canceled_by" uuid NULL,
// // // // // //         "created_at" timestamp NOT NULL DEFAULT now(),
// // // // // //         "updated_at" timestamp NOT NULL DEFAULT now(),
// // // // // //         "deleted_at" timestamp NULL,
// // // // // //         CONSTRAINT "PK_ticket_requests_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_ticket_requests_org_code" UNIQUE ("organization_id", "code")
// // // // // //       );
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_ticket_requests_org_status"
// // // // // //       ON "tenant"."ticket_requests" ("organization_id", "status");
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_ticket_requests_org_requester"
// // // // // //       ON "tenant"."ticket_requests" ("organization_id", "requester_id");
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_ticket_requests_org_approver"
// // // // // //       ON "tenant"."ticket_requests" ("organization_id", "approver_id");
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_ticket_requests_org_created_at"
// // // // // //       ON "tenant"."ticket_requests" ("organization_id", "created_at" DESC);
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "tenant"."ticket_request_cc_members" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "ticket_request_id" uuid NOT NULL,
// // // // // //         "member_id" uuid NOT NULL,
// // // // // //         "added_by" uuid NOT NULL,
// // // // // //         "created_at" timestamp NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_ticket_request_cc_members_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "UQ_ticket_request_cc_members_ticket_member" UNIQUE ("ticket_request_id", "member_id"),
// // // // // //         CONSTRAINT "FK_ticket_request_cc_members_ticket" FOREIGN KEY ("ticket_request_id") REFERENCES "tenant"."ticket_requests"("id") ON DELETE CASCADE
// // // // // //       );
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_ticket_request_cc_members_ticket"
// // // // // //       ON "tenant"."ticket_request_cc_members" ("ticket_request_id");
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "tenant"."ticket_request_comments" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "ticket_request_id" uuid NOT NULL,
// // // // // //         "author_id" uuid NOT NULL,
// // // // // //         "content" text NOT NULL,
// // // // // //         "created_at" timestamp NOT NULL DEFAULT now(),
// // // // // //         "updated_at" timestamp NOT NULL DEFAULT now(),
// // // // // //         "deleted_at" timestamp NULL,
// // // // // //         CONSTRAINT "PK_ticket_request_comments_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "FK_ticket_request_comments_ticket" FOREIGN KEY ("ticket_request_id") REFERENCES "tenant"."ticket_requests"("id") ON DELETE CASCADE
// // // // // //       );
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_ticket_request_comments_ticket_created"
// // // // // //       ON "tenant"."ticket_request_comments" ("ticket_request_id", "created_at" ASC);
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE TABLE IF NOT EXISTS "tenant"."ticket_request_activities" (
// // // // // //         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
// // // // // //         "ticket_request_id" uuid NOT NULL,
// // // // // //         "actor_id" uuid NOT NULL,
// // // // // //         "action" "tenant"."ticket_request_activity_action" NOT NULL,
// // // // // //         "from_status" "tenant"."ticket_request_status" NULL,
// // // // // //         "to_status" "tenant"."ticket_request_status" NULL,
// // // // // //         "payload" jsonb NULL,
// // // // // //         "created_at" timestamp NOT NULL DEFAULT now(),
// // // // // //         CONSTRAINT "PK_ticket_request_activities_id" PRIMARY KEY ("id"),
// // // // // //         CONSTRAINT "FK_ticket_request_activities_ticket" FOREIGN KEY ("ticket_request_id") REFERENCES "tenant"."ticket_requests"("id") ON DELETE CASCADE
// // // // // //       );
// // // // // //     `);
// // // // // // 
// // // // // //     await queryRunner.query(`
// // // // // //       CREATE INDEX IF NOT EXISTS "IDX_ticket_request_activities_ticket_created"
// // // // // //       ON "tenant"."ticket_request_activities" ("ticket_request_id", "created_at" ASC);
// // // // // //     `);
// // // // // // 
// // // // // //     // Add FK constraints only when referenced tables already exist.
// // // // // //     await queryRunner.query(`
// // // // // //       DO $$
// // // // // //       BEGIN
// // // // // //         IF to_regclass('tenant.organizations') IS NOT NULL
// // // // // //           AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_requests_org') THEN
// // // // // //           ALTER TABLE "tenant"."ticket_requests"
// // // // // //           ADD CONSTRAINT "FK_ticket_requests_org"
// // // // // //           FOREIGN KEY ("organization_id") REFERENCES "tenant"."organizations"("id") ON DELETE CASCADE;
// // // // // //         END IF;
// // // // // // 
// // // // // //         IF to_regclass('auth.users') IS NOT NULL THEN
// // // // // //           IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_requests_requester') THEN
// // // // // //             ALTER TABLE "tenant"."ticket_requests"
// // // // // //             ADD CONSTRAINT "FK_ticket_requests_requester"
// // // // // //             FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
// // // // // //           END IF;
// // // // // // 
// // // // // //           IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_requests_approver') THEN
// // // // // //             ALTER TABLE "tenant"."ticket_requests"
// // // // // //             ADD CONSTRAINT "FK_ticket_requests_approver"
// // // // // //             FOREIGN KEY ("approver_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
// // // // // //           END IF;
// // // // // // 
// // // // // //           IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_requests_decided_by') THEN
// // // // // //             ALTER TABLE "tenant"."ticket_requests"
// // // // // //             ADD CONSTRAINT "FK_ticket_requests_decided_by"
// // // // // //             FOREIGN KEY ("decided_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
// // // // // //           END IF;
// // // // // // 
// // // // // //           IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_requests_canceled_by') THEN
// // // // // //             ALTER TABLE "tenant"."ticket_requests"
// // // // // //             ADD CONSTRAINT "FK_ticket_requests_canceled_by"
// // // // // //             FOREIGN KEY ("canceled_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
// // // // // //           END IF;
// // // // // // 
// // // // // //           IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_request_cc_members_member') THEN
// // // // // //             ALTER TABLE "tenant"."ticket_request_cc_members"
// // // // // //             ADD CONSTRAINT "FK_ticket_request_cc_members_member"
// // // // // //             FOREIGN KEY ("member_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
// // // // // //           END IF;
// // // // // // 
// // // // // //           IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_request_cc_members_added_by') THEN
// // // // // //             ALTER TABLE "tenant"."ticket_request_cc_members"
// // // // // //             ADD CONSTRAINT "FK_ticket_request_cc_members_added_by"
// // // // // //             FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
// // // // // //           END IF;
// // // // // // 
// // // // // //           IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_request_comments_author') THEN
// // // // // //             ALTER TABLE "tenant"."ticket_request_comments"
// // // // // //             ADD CONSTRAINT "FK_ticket_request_comments_author"
// // // // // //             FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
// // // // // //           END IF;
// // // // // // 
// // // // // //           IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ticket_request_activities_actor') THEN
// // // // // //             ALTER TABLE "tenant"."ticket_request_activities"
// // // // // //             ADD CONSTRAINT "FK_ticket_request_activities_actor"
// // // // // //             FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;
// // // // // //           END IF;
// // // // // //         END IF;
// // // // // //       END
// // // // // //       $$;
// // // // // //     `);
// // // // // // 
// // // // // //     const hasPermissionTable = await queryRunner.hasTable('rbac.permissions');
// // // // // //     const hasRoleTable = await queryRunner.hasTable('rbac.roles');
// // // // // //     const hasRolePermissionTable = await queryRunner.hasTable(
// // // // // //       'rbac.role_permissions',
// // // // // //     );
// // // // // // 
// // // // // //     if (hasPermissionTable) {
// // // // // //       for (const code of this.allTicketPermissions) {
// // // // // //         await queryRunner.query(
// // // // // //           `
// // // // // //             INSERT INTO "rbac"."permissions" ("code", "name", "module", "description")
// // // // // //             VALUES ($1, $2, 'ticket_requests', 'Permission for ticket requests module')
// // // // // //             ON CONFLICT ("code") DO NOTHING;
// // // // // //           `,
// // // // // //           [code, code.split('.')[1]],
// // // // // //         );
// // // // // //       }
// // // // // //     }
// // // // // // 
// // // // // //     if (hasPermissionTable && hasRoleTable && hasRolePermissionTable) {
// // // // // //       const hasSnakeCaseIsSystemRoleColumn = await queryRunner.hasColumn(
// // // // // //         'rbac.roles',
// // // // // //         'is_system_role',
// // // // // //       );
// // // // // //       const hasCamelCaseIsSystemRoleColumn = await queryRunner.hasColumn(
// // // // // //         'rbac.roles',
// // // // // //         'isSystemRole',
// // // // // //       );
// // // // // //       const systemRoleCondition = hasSnakeCaseIsSystemRoleColumn
// // // // // //         ? 'AND r.is_system_role = true'
// // // // // //         : hasCamelCaseIsSystemRoleColumn
// // // // // //           ? 'AND r."isSystemRole" = true'
// // // // // //           : '';
// // // // // // 
// // // // // //       await queryRunner.query(
// // // // // //         `
// // // // // //           INSERT INTO "rbac"."role_permissions" ("role_id", "permission_id")
// // // // // //           SELECT r.id, p.id
// // // // // //           FROM "rbac"."roles" r
// // // // // //           INNER JOIN "rbac"."permissions" p
// // // // // //             ON p.code = ANY($1::text[])
// // // // // //           WHERE r.name = 'system_admin'
// // // // // //           ${systemRoleCondition}
// // // // // //           ON CONFLICT ("role_id", "permission_id") DO NOTHING;
// // // // // //         `,
// // // // // //         [this.allTicketPermissions],
// // // // // //       );
// // // // // // 
// // // // // //       await queryRunner.query(
// // // // // //         `
// // // // // //           INSERT INTO "rbac"."role_permissions" ("role_id", "permission_id")
// // // // // //           SELECT r.id, p.id
// // // // // //           FROM "rbac"."roles" r
// // // // // //           INNER JOIN "rbac"."permissions" p
// // // // // //             ON p.code = ANY($1::text[])
// // // // // //           WHERE r.name = 'org_admin'
// // // // // //           ${systemRoleCondition}
// // // // // //           ON CONFLICT ("role_id", "permission_id") DO NOTHING;
// // // // // //         `,
// // // // // //         [this.allTicketPermissions],
// // // // // //       );
// // // // // // 
// // // // // //       await queryRunner.query(
// // // // // //         `
// // // // // //           INSERT INTO "rbac"."role_permissions" ("role_id", "permission_id")
// // // // // //           SELECT r.id, p.id
// // // // // //           FROM "rbac"."roles" r
// // // // // //           INNER JOIN "rbac"."permissions" p
// // // // // //             ON p.code = ANY($1::text[])
// // // // // //           WHERE r.name = 'user'
// // // // // //           ${systemRoleCondition}
// // // // // //           ON CONFLICT ("role_id", "permission_id") DO NOTHING;
// // // // // //         `,
// // // // // //         [this.userTicketPermissions],
// // // // // //       );
// // // // // //     }
// // // // // //   }
// // // // // // 
// // // // // //   public async down(queryRunner: QueryRunner): Promise<void> {
// // // // // //     const hasRolePermissionTable = await queryRunner.hasTable(
// // // // // //       'rbac.role_permissions',
// // // // // //     );
// // // // // //     const hasPermissionTable = await queryRunner.hasTable('rbac.permissions');
// // // // // // 
// // // // // //     if (hasRolePermissionTable && hasPermissionTable) {
// // // // // //       await queryRunner.query(
// // // // // //         `
// // // // // //           DELETE FROM "rbac"."role_permissions"
// // // // // //           WHERE "permission_id" IN (
// // // // // //             SELECT "id"
// // // // // //             FROM "rbac"."permissions"
// // // // // //             WHERE "code" = ANY($1::text[])
// // // // // //           );
// // // // // //         `,
// // // // // //         [this.allTicketPermissions],
// // // // // //       );
// // // // // //     }
// // // // // // 
// // // // // //     if (hasPermissionTable) {
// // // // // //       await queryRunner.query(
// // // // // //         `
// // // // // //           DELETE FROM "rbac"."permissions"
// // // // // //           WHERE "code" = ANY($1::text[]);
// // // // // //         `,
// // // // // //         [this.allTicketPermissions],
// // // // // //       );
// // // // // //     }
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TABLE IF EXISTS "tenant"."ticket_request_activities"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TABLE IF EXISTS "tenant"."ticket_request_comments"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TABLE IF EXISTS "tenant"."ticket_request_cc_members"`,
// // // // // //     );
// // // // // //     await queryRunner.query(`DROP TABLE IF EXISTS "tenant"."ticket_requests"`);
// // // // // // 
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TYPE IF EXISTS "tenant"."ticket_request_activity_action"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TYPE IF EXISTS "tenant"."ticket_request_priority"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TYPE IF EXISTS "tenant"."ticket_request_status"`,
// // // // // //     );
// // // // // //     await queryRunner.query(
// // // // // //       `DROP TYPE IF EXISTS "tenant"."ticket_request_type"`,
// // // // // //     );
// // // // // //   }
// // // // // // }
// // // // // // 
// // // // // // 