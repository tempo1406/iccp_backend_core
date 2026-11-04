/*
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddListOwnPermissionToTicketRequests1764200000000
  implements MigrationInterface
{
  name = 'AddListOwnPermissionToTicketRequests1764200000000';

  private readonly permissionCode = 'ticket_requests.list_own';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasPermissionTable = await queryRunner.hasTable('rbac.permissions');
    const hasRoleTable = await queryRunner.hasTable('rbac.roles');
    const hasRolePermissionTable = await queryRunner.hasTable(
      'rbac.role_permissions',
    );

    if (hasPermissionTable) {
      await queryRunner.query(
        `
          INSERT INTO "rbac"."permissions" ("code", "name", "module", "description")
          VALUES ($1, 'list_own', 'ticket_requests', 'List ticket requests related to current user')
          ON CONFLICT ("code") DO NOTHING;
        `,
        [this.permissionCode],
      );
    }

    if (hasPermissionTable && hasRoleTable && hasRolePermissionTable) {
      await queryRunner.query(
        `
          INSERT INTO "rbac"."role_permissions" ("role_id", "permission_id")
          SELECT r.id, p.id
          FROM "rbac"."roles" r
          INNER JOIN "rbac"."permissions" p ON p.code = $1
          WHERE (
            r.name IN ('system_admin', 'org_admin', 'user')
            OR (
              r.name = 'employee'
              AND r."organizationId" IS NOT NULL
              AND r."project_id" IS NULL
            )
          )
          ON CONFLICT ("role_id", "permission_id") DO NOTHING;
        `,
        [this.permissionCode],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasPermissionTable = await queryRunner.hasTable('rbac.permissions');
    const hasRolePermissionTable = await queryRunner.hasTable(
      'rbac.role_permissions',
    );

    if (hasRolePermissionTable && hasPermissionTable) {
      await queryRunner.query(
        `
          DELETE FROM "rbac"."role_permissions"
          WHERE "permission_id" IN (
            SELECT "id"
            FROM "rbac"."permissions"
            WHERE "code" = $1
          );
        `,
        [this.permissionCode],
      );
    }

    if (hasPermissionTable) {
      await queryRunner.query(
        `
          DELETE FROM "rbac"."permissions"
          WHERE "code" = $1;
        `,
        [this.permissionCode],
      );
    }
  }
}

*/