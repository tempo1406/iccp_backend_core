import { ChatBoxCoreModule } from '@modules/chat-box/core/chat-box-core.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMemberService } from './project-member.service';
import { ProjectMemberController } from './project-member.controller';
import { ProjectMember } from '../core/entities/project-member.entity';
import { ProjectCoreModule } from '../core/project-core.module';
import { Role } from '@modules/rbac/entities/role.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';

@Module({
  imports: [
    ProjectCoreModule,
    ChatBoxCoreModule,
    TypeOrmModule.forFeature([ProjectMember, Role, UserRole]),
  ],
  controllers: [ProjectMemberController],
  providers: [ProjectMemberService],
})
export class ProjectMemberModule {}
