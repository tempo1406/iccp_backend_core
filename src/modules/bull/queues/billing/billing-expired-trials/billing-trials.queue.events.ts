import { QueueEventsListener } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { AbstractQueueEvents } from '@modules/bull/base/abstract-queue.events';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';

@QueueEventsListener(QUEUE_NAME.BILLING_EXPIRED_TRIALS, {
  blockingTimeout: 1000,
})
export class BillingTrialsQueueEvents extends AbstractQueueEvents {
  protected readonly logger = new Logger(BillingTrialsQueueEvents.name);
}
