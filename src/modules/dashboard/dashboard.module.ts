import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KpiTargetModule } from '@modules/analytics/kpi-target/kpi-target.module';
import { OrgKpiModule } from '@modules/analytics/org-kpi/org-kpi.module';
import { MessageManagementModule } from '@modules/chat-box/message-management/message-management.module';
import { Document } from '@modules/document/core/entities/document.entity';
import { NotificationCoreModule } from '@modules/notification/core/notification-core.module';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { OrganizationInvitation } from '@modules/organization/core/entities/organization-invitation.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { TicketRequestCoreModule } from '@modules/ticket-request/core/core.module';
import { User } from '@modules/users/entities/user.entity';
import { StatusTask } from '@modules/project/status-task/entities/status-task.entity';
import { Task } from '@modules/project/task-management/entities/task.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      Organization,
      OrganizationInvitation,
      OrganizationMember,
      Permission,
      Project,
      ProjectMember,
      Role,
      RolePermission,
      StatusTask,
      Task,
      User,
      UserRole,
    ]),
    KpiTargetModule,
    MessageManagementModule,
    NotificationCoreModule,
    OrgKpiModule,
    TicketRequestCoreModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
