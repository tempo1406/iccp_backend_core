import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { ProjectCoreController } from './project-core.controller';
import { ProjectCoreService } from './project-core.service';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { Task } from '../task-management/entities/task.entity';
import { ProjectInvite } from './entities/project-invite.entity';
import { StatusTask } from '../status-task/entities/status-task.entity';
import { User } from '@modules/users/entities/user.entity';
import { MaillerModule } from '@modules/mail/mail.module';

@Module({
  imports: [
    MaillerModule,
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      ProjectInvite,
      Task,
      StatusTask,
      OrganizationMember,
      UserRole,
      RolePermission,
      Permission,
      Role,
      User,
    ]),
  ],
  controllers: [ProjectCoreController],
  providers: [ProjectCoreService],
  exports: [ProjectCoreService],
})
export class ProjectCoreModule {}
