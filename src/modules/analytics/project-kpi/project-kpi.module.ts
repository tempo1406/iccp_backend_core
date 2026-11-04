import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '@modules/project/core/entities/project.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Task } from '@modules/project/task-management/entities/task.entity';
import { StatusTask } from '@modules/project/status-task/entities/status-task.entity';
import { User } from '@modules/users/entities/user.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { WorkingTimeModule } from '@modules/organization/working-time/working-time.module';
import { KpiSettingsResolverModule } from '@modules/analytics/kpi-settings-resolver.module';
import { KpiActualModule } from '@modules/analytics/kpi-actual.module';
import { ProjectKpiService } from './project-kpi.service';
import { ProjectKpiController } from './project-kpi.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      Task,
      StatusTask,
      User,
      UserRole,
      RolePermission,
      Permission,
    ]),
    WorkingTimeModule,
    KpiSettingsResolverModule,
    KpiActualModule,
  ],
  controllers: [ProjectKpiController],
  providers: [ProjectKpiService],
})
export class ProjectKpiModule {}
