import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationCoreModule } from '@modules/notification/core/notification-core.module';
import { Notification } from '@modules/notification/core/entities/notification.entity';
import { User } from '@modules/users/entities/user.entity';
import { Task } from '../task-management/entities/task.entity';
import { Project } from '../core/entities/project.entity';
import { ProjectMember } from '../core/entities/project-member.entity';
import { ProjectInvite } from '../core/entities/project-invite.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { StatusTask } from '../status-task/entities/status-task.entity';
import { ProjectNotificationListener } from './project-notification.listener';
import { ProjectDeadlineNotificationService } from './project-deadline-notification.service';
import { ProjectNotificationBindings } from './project-notification.bindings';

@Module({
  imports: [
    NotificationCoreModule,
    TypeOrmModule.forFeature([
      Notification,
      User,
      Task,
      Project,
      ProjectMember,
      ProjectInvite,
      Role,
      StatusTask,
    ]),
  ],
  providers: [
    ProjectNotificationListener,
    ProjectDeadlineNotificationService,
    ProjectNotificationBindings,
  ],
})
export class ProjectNotificationModule {}
