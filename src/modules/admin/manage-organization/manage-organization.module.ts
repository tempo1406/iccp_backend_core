import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ManageOrganizationService } from './manage-organization.service';
import { ManageOrganizationController } from './manage-organization.controller';

import { Organization } from '@modules/organization/core/entities/organization.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { Subscription } from '@modules/billing/entities/subscription.entity';
import { SubscriptionPlan } from '@modules/billing/entities/subscription-plan.entity';
import { User } from '@modules/users/entities/user.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RbacModule } from '@modules/rbac/rbac.module';

@Module({
  imports: [
    RbacModule,
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      Subscription,
      SubscriptionPlan,
      User,
      // RBAC entities needed by PermissionGuard via RbacService
      UserRole,
      Role,
      RolePermission,
      Permission,
    ]),
  ],
  controllers: [ManageOrganizationController],
  providers: [ManageOrganizationService],
})
export class ManageOrganizationModule {}
