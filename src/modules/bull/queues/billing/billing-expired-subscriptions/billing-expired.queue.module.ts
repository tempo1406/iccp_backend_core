import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BillingModule } from '@modules/billing/billing.module';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { BillingExpiredQueueEvents } from './billing-expired.queue.events';
import { BillingExpiredQueueProcessor } from './billing-expired.queue.processor';
import { BillingExpiredQueueService } from './billing-expired.queue.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAME.BILLING_EXPIRED_SUBSCRIPTIONS }),
    BillingModule,
  ],
  providers: [
    BillingExpiredQueueService,
    BillingExpiredQueueProcessor,
    BillingExpiredQueueEvents,
  ],
  exports: [BillingExpiredQueueService],
})
export class BillingExpiredQueueModule {}
