import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PeriodicReportModule } from '@modules/analytics/periodic-report/periodic-report.module';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { PeriodicReportQueueEvents } from './periodic-report.queue.events';
import { PeriodicReportQueueProcessor } from './periodic-report.queue.processor';
import { PeriodicReportQueueService } from './periodic-report.queue.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAME.PERIODIC_REPORT_DISPATCH }),
    PeriodicReportModule,
  ],
  providers: [
    PeriodicReportQueueService,
    PeriodicReportQueueProcessor,
    PeriodicReportQueueEvents,
  ],
  exports: [PeriodicReportQueueService],
})
export class PeriodicReportQueueModule {}
