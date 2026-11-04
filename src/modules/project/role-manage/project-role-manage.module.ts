import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectRoleManageService } from './project-role-manage.service';
import { ProjectRoleManageController } from './project-role-manage.controller';
import { Role } from '@modules/rbac/entities/role.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { Project } from '../core/entities/project.entity';
import { ProjectMember } from '../core/entities/project-member.entity';
import { ProjectCoreModule } from '../core/project-core.module';

@Module({
  imports: [
    ProjectCoreModule,
    TypeOrmModule.forFeature([
      Role,
      UserRole,
      Permission,
      RolePermission,
      Project,
      ProjectMember,
    ]),
  ],
  controllers: [ProjectRoleManageController],
  providers: [ProjectRoleManageService],
})
export class ProjectRoleManageModule {}
