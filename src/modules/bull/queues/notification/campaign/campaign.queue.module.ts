import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CampaignModule } from '@modules/notification/campaign/campaign.module';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { CampaignQueueEvents } from './campaign.queue.events';
import { CampaignQueueProcessor } from './campaign.queue.processor';
import { CampaignQueueService } from './campaign.queue.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAME.CAMPAIGN_PROCESS }),
    CampaignModule,
  ],
  providers: [CampaignQueueService, CampaignQueueProcessor, CampaignQueueEvents],
  exports: [CampaignQueueService],
})
export class CampaignQueueModule {}
