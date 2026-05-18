import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AbstractQueueService } from '@modules/bull/base/abstract-queue.service';
import { ICronQueueConfig } from '@modules/bull/base/interfaces/queue-job.interface';
import {
  QUEUE_NAME,
  QUEUE_PATTERN,
} from '@modules/bull/constants/queue.constant';
import { DEFAULT_TIMEZONE } from '@common/constants/timezone.constant';

@Injectable()
export class BillingTrialsQueueService extends AbstractQueueService {
  protected readonly logger = new Logger(BillingTrialsQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAME.BILLING_EXPIRED_TRIALS)
    protected readonly queue: Queue,
  ) {
    super();
  }

  protected getCronConfig(): ICronQueueConfig {
    return {
      jobName: QUEUE_NAME.BILLING_EXPIRED_TRIALS,
      cronPattern: QUEUE_PATTERN.EVERY_HOUR,
      timezone: DEFAULT_TIMEZONE,
    };
  }
}
