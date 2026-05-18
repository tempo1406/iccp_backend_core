import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BillingModule } from '@modules/billing/billing.module';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { BillingTrialsQueueEvents } from './billing-trials.queue.events';
import { BillingTrialsQueueProcessor } from './billing-trials.queue.processor';
import { BillingTrialsQueueService } from './billing-trials.queue.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAME.BILLING_EXPIRED_TRIALS }),
    BillingModule,
  ],
  providers: [
    BillingTrialsQueueService,
    BillingTrialsQueueProcessor,
    BillingTrialsQueueEvents,
  ],
  exports: [BillingTrialsQueueService],
})
export class BillingTrialsQueueModule {}
