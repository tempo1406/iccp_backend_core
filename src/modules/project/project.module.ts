import { Module } from '@nestjs/common';
import { ProjectRoleManageModule } from './role-manage/project-role-manage.module';
import { ProjectCoreModule } from './core/project-core.module';
import { TaskManagementModule } from './task-management/task-management.module';
import { ProjectMemberModule } from './project-member/project-member.module';
import { StatusTaskModule } from './status-task/status-task.module';
import { ProjectRealtimeModule } from './realtime/project-realtime.module';
import { ProjectNotificationModule } from './notifications/project-notification.module';
import { ProjectSettingsModule } from './settings/project-settings.module';
import { ProjectDashboardModule } from './project-dashboard/project-dashboard.module';

@Module({
  imports: [
    ProjectCoreModule,
    ProjectMemberModule,
    StatusTaskModule,
    TaskManagementModule,
    ProjectRoleManageModule,
    ProjectRealtimeModule,
    ProjectNotificationModule,
    ProjectSettingsModule,
    ProjectDashboardModule,
  ],
})
export class ProjectModule {}
