import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgNotificationController } from './org-notification.controller';
import { OrgNotificationService } from './org-notification.service';
import { InvitationNotificationListener } from './listeners/invitation-notification.listener';
import { CampaignModule } from '@modules/notification/campaign/campaign.module';
import { NotificationCoreModule } from '@modules/notification/core/notification-core.module';
import { MaillerModule } from '@modules/mail/mail.module';
import { User } from '@modules/users/entities/user.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';

@Module({
  imports: [
    CampaignModule,
    NotificationCoreModule,
    MaillerModule,
    TypeOrmModule.forFeature([User, Organization]),
  ],
  controllers: [OrgNotificationController],
  providers: [OrgNotificationService, InvitationNotificationListener],
})
export class OrgNotificationModule {}
