import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DailyReportModule } from '@modules/daily-report/daily-report.module';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { DailyReportRemindersQueueEvents } from './daily-report-reminders.queue.events';
import { DailyReportRemindersQueueProcessor } from './daily-report-reminders.queue.processor';
import { DailyReportRemindersQueueService } from './daily-report-reminders.queue.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAME.DAILY_REPORT_REMINDERS }),
    DailyReportModule,
  ],
  providers: [
    DailyReportRemindersQueueService,
    DailyReportRemindersQueueProcessor,
    DailyReportRemindersQueueEvents,
  ],
  exports: [DailyReportRemindersQueueService],
})
export class DailyReportRemindersQueueModule {}
