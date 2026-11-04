import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberManageService } from './member-manage.service';
import { MemberManageController } from './member-manage.controller';
import { OrganizationMember } from '../core/entities/organization-member.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { User } from '@modules/users/entities/user.entity';
import { OrganizationCoreModule } from '../core/organization-core.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationMember, UserRole, Role, User]),
    OrganizationCoreModule,
  ],
  controllers: [MemberManageController],
  providers: [MemberManageService],
})
export class MemberManageModule {}
