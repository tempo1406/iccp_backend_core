import { Injectable } from '@nestjs/common';
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  In,
} from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { USER_PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { defaultRoleOfOrg } from '@modules/organization/constants/role.constant';

@Injectable()
@EventSubscriber()
export class OrganizationSubscriber implements EntitySubscriberInterface<Organization> {
  listenTo() {
    return Organization;
  }

  /**
   * Sau khi tạo Organization mới:
   * - Tạo role "member" mặc định (org-scoped)
   * - Gán USER_PERMISSIONS cho role đó
   */
  async afterInsert(event: InsertEvent<Organization>): Promise<void> {
    try {
      const manager = event.manager;
      const orgId = event.entity?.id;
      if (!orgId) return;

      // 1. Tạo role "member" cho org mới
      const memberRole = manager.create(Role, {
        name: defaultRoleOfOrg.name,
        description: defaultRoleOfOrg.description,
        isSystemRole: false,
        organizationId: orgId,
        createdBy: event.entity.ownerId,
      });
      const savedRole = await manager.save(memberRole);

      // 2. Lấy danh sách permission IDs từ USER_PERMISSIONS
      const permissions = await manager.find(Permission, {
        where: { code: In(USER_PERMISSIONS) },
      });

      if (permissions.length === 0) {
        console.warn(
          '[OrganizationSubscriber] No permissions found for USER_PERMISSIONS. Skipping permission assignment.',
        );
        return;
      }

      // 3. Gán permissions cho role member
      const rolePermissions = permissions.map((perm) =>
        manager.create(RolePermission, {
          roleId: savedRole.id,
          permissionId: perm.id,
        }),
      );
      await manager.save(rolePermissions);

      console.log(
        `[OrganizationSubscriber] Created "member" role with ${permissions.length} permissions for org ${orgId}`,
      );
    } catch (error) {
      console.error(
        '[OrganizationSubscriber] Error creating default member role:',
        error,
      );
    }
  }
}
