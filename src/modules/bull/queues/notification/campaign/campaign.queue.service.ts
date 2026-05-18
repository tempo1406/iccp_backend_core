import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AbstractQueueService } from '@modules/bull/base/abstract-queue.service';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { CampaignProcessEvent } from '@modules/notification/core/constants/notification-events.constant';

/**
 * Event-driven queue — không setup cron.
 * Caller inject service này và gọi `enqueue(event)` thay vì `eventEmitter.emit()`.
 */
@Injectable()
export class CampaignQueueService extends AbstractQueueService<
  CampaignProcessEvent & Record<string, unknown>
> {
  protected readonly logger = new Logger(CampaignQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAME.CAMPAIGN_PROCESS)
    protected readonly queue: Queue<
      CampaignProcessEvent & Record<string, unknown>
    >,
  ) {
    super();
  }
}
