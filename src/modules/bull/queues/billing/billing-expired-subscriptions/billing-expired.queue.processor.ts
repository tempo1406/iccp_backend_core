import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AbstractQueueProcessor } from '@modules/bull/base/abstract-queue.processor';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { BillingCronService } from '@modules/billing/billing-cron.service';

@Processor(QUEUE_NAME.BILLING_EXPIRED_SUBSCRIPTIONS, { concurrency: 1 })
export class BillingExpiredQueueProcessor extends AbstractQueueProcessor {
  protected readonly logger = new Logger(BillingExpiredQueueProcessor.name);

  constructor(private readonly billingCronService: BillingCronService) {
    super();
  }

  protected async handle(_job: Job): Promise<void> {
    await this.billingCronService.handleExpiredSubscriptions();
  }
}
