import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskManagementController } from './task-management.controller';
import { TaskManagementService } from './task-management.service';
import { ProjectCoreModule } from '../core/project-core.module';
import { TaskHistory } from './entities/task-history.entity';
import { TaskTag } from './entities/task-tag.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskCommentMention } from './entities/task-comment-mention.entity';
import { TaskCommentReaction } from './entities/task-comment-reaction.entity';
import { User } from '@modules/users/entities/user.entity';
import { ProjectMember } from '../core/entities/project-member.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { TaskSlugCounter } from './entities/task-slug-counter.entity';
import { StatusTask } from '../status-task/entities/status-task.entity';
import { TaskWorklog } from './entities/task-worklog.entity';
import { TaskWorklogController } from './task-worklog.controller';
import { TaskWorklogService } from './task-worklog.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskWorklog,
      TaskSlugCounter,
      StatusTask,
      TaskHistory,
      TaskTag,
      TaskAttachment,
      TaskComment,
      TaskCommentMention,
      TaskCommentReaction,
      User,
      ProjectMember,
      UserRole,
      Role,
    ]),
    ProjectCoreModule,
  ],
  controllers: [TaskManagementController, TaskWorklogController],
  providers: [TaskManagementService, TaskWorklogService],
})
export class TaskManagementModule {}
