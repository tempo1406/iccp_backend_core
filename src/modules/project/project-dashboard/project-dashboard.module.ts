import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../task-management/entities/task.entity';
import { StatusTask } from '../status-task/entities/status-task.entity';
import { ProjectMember } from '../core/entities/project-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { ProjectCoreModule } from '../core/project-core.module';
import { ProjectDashboardController } from './project-dashboard.controller';
import { ProjectDashboardService } from './project-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, StatusTask, ProjectMember, User, UserRole, Role]),
    ProjectCoreModule,
  ],
  controllers: [ProjectDashboardController],
  providers: [ProjectDashboardService],
})
export class ProjectDashboardModule {}
