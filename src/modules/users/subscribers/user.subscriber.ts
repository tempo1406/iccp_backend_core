import { Injectable } from '@nestjs/common';
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { SYSTEM_ROLES } from '@modules/rbac/constant/permission.constant';

@Injectable()
@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  listenTo() {
    return User;
  }

  // Tự động gán system role 'user' cho user mới sau khi insert
  async afterInsert(event: InsertEvent<User>): Promise<void> {
    try {
      const manager = event.manager;
      const userId = event.entity?.id;
      if (!userId) return;

      const userRole = await manager.findOne(Role, {
        where: { name: SYSTEM_ROLES.USER, isSystemRole: true },
      });

      if (!userRole) {
        console.warn(
          `[UserSubscriber] System role '${SYSTEM_ROLES.USER}' not found. Skipping auto-assign.`,
        );
        return;
      }

      await manager.insert(UserRole, {
        userId,
        roleId: userRole.id,
        organizationId: null,
      });
    } catch (error) {
      console.error(
        '[UserSubscriber] Error auto-assigning role to user:',
        error,
      );
      // Không throw error để không ảnh hưởng tới flow tạo user chính
    }
  }
}
