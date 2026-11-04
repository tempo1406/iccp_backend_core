import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { KpiDigestModule } from '@modules/analytics/kpi-digest/kpi-digest.module';
import { QUEUE_NAME } from '@modules/bull/constants/queue.constant';
import { KpiDigestQueueEvents } from './kpi-digest.queue.events';
import { KpiDigestQueueProcessor } from './kpi-digest.queue.processor';
import { KpiDigestQueueService } from './kpi-digest.queue.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAME.KPI_DIGEST_DISPATCH }),
    KpiDigestModule,
  ],
  providers: [
    KpiDigestQueueService,
    KpiDigestQueueProcessor,
    KpiDigestQueueEvents,
  ],
  exports: [KpiDigestQueueService],
})
export class KpiDigestQueueModule {}
