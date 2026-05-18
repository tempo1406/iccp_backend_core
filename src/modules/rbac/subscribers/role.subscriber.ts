import {
  EntitySubscriberInterface,
  EventSubscriber,
  RemoveEvent,
  SoftRemoveEvent,
} from 'typeorm';
import { Role } from '../entities/role.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { UserRole } from '../entities/user-role.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
@EventSubscriber()
export class RoleSubscriber implements EntitySubscriberInterface<Role> {
  // Lắng nghe các event trên Entity Role
  listenTo() {
    return Role;
  }

  // Chạy ngay trước khi Role thực sự bị delete khỏi DB bằng hàm .remove()
  async beforeRemove(event: RemoveEvent<Role>) {
    const roleId = event.entityId || event.databaseEntity?.id;

    if (!roleId) return;

    // Lấy queryManager từ event để chạy transaction an toàn cùng với câu lệnh Xóa Role
    const manager = event.manager;

    console.log(`[RoleSubscriber] Deleting dependencies for roleId: ${roleId}`);

    // Xóa tất cả trong 1 transaction an toàn theo Entity Class
    await manager.delete(RolePermission, { roleId });
    await manager.delete(UserRole, { roleId });
  }

  // Chạy ngay trước khi Role bị soft-delete (softRemove)
  async beforeSoftRemove(event: SoftRemoveEvent<Role>) {
    const roleId = event.entityId || event.databaseEntity?.id;

    if (!roleId) return;

    const manager = event.manager;

    console.log(
      `[RoleSubscriber] Soft-deleting dependencies for roleId: ${roleId}`,
    );

    // Xóa role_permissions và user_roles liên quan khi soft-delete role
    await manager.delete(RolePermission, { roleId });
    await manager.delete(UserRole, { roleId });
  }
}
