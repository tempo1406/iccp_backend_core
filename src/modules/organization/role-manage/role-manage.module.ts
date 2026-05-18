import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleManageService } from './role-manage.service';
import { RoleManageController } from './role-manage.controller';
import { Role } from '@modules/rbac/entities/role.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { OrganizationMember } from '../core/entities/organization-member.entity';
import { OrganizationCoreModule } from '../core/organization-core.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      UserRole,
      Permission,
      RolePermission,
      OrganizationMember,
    ]),
    OrganizationCoreModule,
  ],
  controllers: [RoleManageController],
  providers: [RoleManageService],
})
export class RoleManageModule {}
