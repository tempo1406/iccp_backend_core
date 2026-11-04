import { QueueEventsListener } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { AbstractQueueEvents } from '@modules/bull/base/abstract-queue.events';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';

@QueueEventsListener(QUEUE_NAME.KPI_DIGEST_DISPATCH, { blockingTimeout: 1000 })
export class KpiDigestQueueEvents extends AbstractQueueEvents {
  protected readonly logger = new Logger(KpiDigestQueueEvents.name);
}
