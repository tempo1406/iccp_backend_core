import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AbstractQueueProcessor } from '@modules/bull/base/abstract-queue.processor';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { KpiDigestService } from '@modules/analytics/kpi-digest/kpi-digest.service';

@Processor(QUEUE_NAME.KPI_DIGEST_DISPATCH, { concurrency: 1 })
export class KpiDigestQueueProcessor extends AbstractQueueProcessor {
  protected readonly logger = new Logger(KpiDigestQueueProcessor.name);

  constructor(private readonly kpiDigestService: KpiDigestService) {
    super();
  }

  protected async handle(_job: Job): Promise<void> {
    await this.kpiDigestService.dispatchDueDigests();
  }
}
