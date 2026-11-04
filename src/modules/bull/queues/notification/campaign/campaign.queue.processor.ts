import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AbstractQueueProcessor } from '@modules/bull/base/abstract-queue.processor';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { CampaignService } from '@modules/notification/campaign/campaign.service';
import { CampaignProcessEvent } from '@modules/notification/core/constants/notification-events.constant';

@Processor(QUEUE_NAME.CAMPAIGN_PROCESS, { concurrency: 2 })
export class CampaignQueueProcessor extends AbstractQueueProcessor<
  CampaignProcessEvent & Record<string, unknown>
> {
  protected readonly logger = new Logger(CampaignQueueProcessor.name);

  constructor(private readonly campaignService: CampaignService) {
    super();
  }

  protected async handle(
    job: Job<CampaignProcessEvent & Record<string, unknown>>,
  ): Promise<void> {
    await this.campaignService.processCampaignBatch(job.data);
  }
}
