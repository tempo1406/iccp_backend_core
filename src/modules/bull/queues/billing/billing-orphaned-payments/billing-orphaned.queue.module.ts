import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BillingModule } from '@modules/billing/billing.module';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { BillingOrphanedQueueEvents } from './billing-orphaned.queue.events';
import { BillingOrphanedQueueProcessor } from './billing-orphaned.queue.processor';
import { BillingOrphanedQueueService } from './billing-orphaned.queue.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAME.BILLING_ORPHANED_PAYMENTS }),
    BillingModule,
  ],
  providers: [
    BillingOrphanedQueueService,
    BillingOrphanedQueueProcessor,
    BillingOrphanedQueueEvents,
  ],
  exports: [BillingOrphanedQueueService],
})
export class BillingOrphanedQueueModule {}
