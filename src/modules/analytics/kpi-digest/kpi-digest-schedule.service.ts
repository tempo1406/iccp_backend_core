import { Injectable, Logger } from '@nestjs/common';
import { KpiDigestService } from './kpi-digest.service';

@Injectable()
export class KpiDigestScheduleService {
  private readonly logger = new Logger(KpiDigestScheduleService.name);

  constructor(private readonly kpiDigestService: KpiDigestService) {}

  async dispatchDueDigests(): Promise<void> {
    try {
      await this.kpiDigestService.dispatchDueDigests();
    } catch (error) {
      this.logger.error(`KPI digest scheduling failed: ${String(error)}`);
    }
  }
}
