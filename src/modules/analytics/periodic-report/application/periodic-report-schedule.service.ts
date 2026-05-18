import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PeriodicReportService } from './periodic-report.service';

@Injectable()
export class PeriodicReportScheduleService {
  private readonly logger = new Logger(PeriodicReportScheduleService.name);

  constructor(private readonly periodicReportService: PeriodicReportService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduleLatestPeriodRuns(): Promise<void> {
    try {
      await this.periodicReportService.scheduleLatestPeriodRuns();
    } catch (error) {
      this.logger.error(
        `Periodic report scheduling failed: ${String(error)}`,
      );
    }
  }
}
