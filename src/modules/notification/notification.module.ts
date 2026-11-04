import { Module } from '@nestjs/common';
import { NotificationCoreModule } from './core/notification-core.module';
import { CampaignModule } from './campaign/campaign.module';

@Module({
  imports: [NotificationCoreModule, CampaignModule],
  exports: [NotificationCoreModule, CampaignModule],
})
export class NotificationModule {}
