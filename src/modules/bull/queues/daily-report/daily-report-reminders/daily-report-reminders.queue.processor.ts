import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AbstractQueueProcessor } from '@modules/bull/base/abstract-queue.processor';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { DailyReportReminderScheduleService } from '@modules/daily-report/daily-report-reminder-schedule.service';

@Processor(QUEUE_NAME.DAILY_REPORT_REMINDERS, { concurrency: 1 })
export class DailyReportRemindersQueueProcessor extends AbstractQueueProcessor {
  protected readonly logger = new Logger(
    DailyReportRemindersQueueProcessor.name,
  );

  constructor(
    private readonly reminderService: DailyReportReminderScheduleService,
  ) {
    super();
  }

  protected async handle(_job: Job): Promise<void> {
    await this.reminderService.dispatchPendingDailyReportReminders();
  }
}
