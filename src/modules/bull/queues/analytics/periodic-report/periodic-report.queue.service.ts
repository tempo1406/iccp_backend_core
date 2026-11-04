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
export class PeriodicReportQueueService extends AbstractQueueService {
  protected readonly logger = new Logger(PeriodicReportQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAME.PERIODIC_REPORT_DISPATCH)
    protected readonly queue: Queue,
  ) {
    super();
  }

  protected getCronConfig(): ICronQueueConfig {
    return {
      jobName: QUEUE_NAME.PERIODIC_REPORT_DISPATCH,
      cronPattern: QUEUE_PATTERN.EVERY_15_MIN,
      timezone: DEFAULT_TIMEZONE,
    };
  }
}
