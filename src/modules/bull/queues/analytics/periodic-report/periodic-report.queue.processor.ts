import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AbstractQueueProcessor } from '@modules/bull/base/abstract-queue.processor';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { PeriodicReportService } from '@modules/analytics/periodic-report/application/periodic-report.service';

@Processor(QUEUE_NAME.PERIODIC_REPORT_DISPATCH, { concurrency: 1 })
export class PeriodicReportQueueProcessor extends AbstractQueueProcessor {
  protected readonly logger = new Logger(PeriodicReportQueueProcessor.name);

  constructor(private readonly periodicReportService: PeriodicReportService) {
    super();
  }

  protected async handle(_job: Job): Promise<void> {
    await this.periodicReportService.scheduleLatestPeriodRuns();
    await this.periodicReportService.dispatchDueRuns();
  }
}
