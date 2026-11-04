import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteManagerService } from './invite-manager.service';
import { InviteManagerController } from './invite-manager.controller';
import { OrganizationInvitation } from '@modules/organization/core/entities/organization-invitation.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationInvitation, Organization])],
  controllers: [InviteManagerController],
  providers: [InviteManagerService],
})
export class InviteManagerModule {}
