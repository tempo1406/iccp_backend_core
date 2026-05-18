import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { OrganizationInvitation } from './entities/organization-invitation.entity';
import { Subscription } from '@modules/billing/entities/subscription.entity';
import { SubscriptionPlan } from '@modules/billing/entities/subscription-plan.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { OrganizationCoreController } from './organization-core.controller';
import { OrganizationCoreService } from './organization-core.service';
import { OrganizationSubscriber } from './subscribers/organization.subscriber';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      OrganizationInvitation,
      Subscription,
      SubscriptionPlan,
      Role,
      UserRole,
      Permission,
      RolePermission,
    ]),
  ],
  controllers: [OrganizationCoreController],
  providers: [OrganizationCoreService, OrganizationSubscriber],
  exports: [OrganizationCoreService],
})
export class OrganizationCoreModule {}
