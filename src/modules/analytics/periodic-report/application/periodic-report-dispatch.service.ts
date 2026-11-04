import { Injectable, Logger } from '@nestjs/common';
import { PeriodicReportService } from './periodic-report.service';

@Injectable()
export class PeriodicReportDispatchService {
  private readonly logger = new Logger(PeriodicReportDispatchService.name);

  constructor(private readonly periodicReportService: PeriodicReportService) {}

  async dispatchDueRuns(): Promise<void> {
    try {
      await this.periodicReportService.dispatchDueRuns();
    } catch (error) {
      this.logger.error(`Periodic report dispatch failed: ${String(error)}`);
    }
  }
}
