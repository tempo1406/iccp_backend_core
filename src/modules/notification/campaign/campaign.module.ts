import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CampaignQueueService } from '@modules/bull/queues/notification/campaign/campaign.queue.service';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationCampaign } from './entities/notification-campaign.entity';
import { User } from '@modules/users/entities/user.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { NotificationCoreModule } from '../core/notification-core.module';
import { MaillerModule } from '@modules/mail/mail.module';
import { WebsocketModule } from '@modules/websocket/websocket.module';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAME.CAMPAIGN_PROCESS }),
    TypeOrmModule.forFeature([
      NotificationCampaign,
      User,
      OrganizationMember,
      UserRole,
    ]),
    NotificationCoreModule,
    MaillerModule,
    WebsocketModule,
  ],
  controllers: [CampaignController],
  providers: [CampaignService, CampaignQueueService],
  exports: [CampaignService],
})
export class CampaignModule {}
