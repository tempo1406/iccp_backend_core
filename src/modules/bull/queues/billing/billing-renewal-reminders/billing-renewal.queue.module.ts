import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BillingModule } from '@modules/billing/billing.module';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { BillingRenewalQueueEvents } from './billing-renewal.queue.events';
import { BillingRenewalQueueProcessor } from './billing-renewal.queue.processor';
import { BillingRenewalQueueService } from './billing-renewal.queue.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAME.BILLING_RENEWAL_REMINDERS }),
    BillingModule,
  ],
  providers: [
    BillingRenewalQueueService,
    BillingRenewalQueueProcessor,
    BillingRenewalQueueEvents,
  ],
  exports: [BillingRenewalQueueService],
})
export class BillingRenewalQueueModule {}
