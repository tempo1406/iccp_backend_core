import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { bullConnectConfig } from './configs/bull-connect.config';
import { buildQueueConfig } from './configs/queue.config';
import { BillingExpiredQueueModule } from './queues/billing/billing-expired-subscriptions/billing-expired.queue.module';
import { BillingRenewalQueueModule } from './queues/billing/billing-renewal-reminders/billing-renewal.queue.module';
import { BillingOrphanedQueueModule } from './queues/billing/billing-orphaned-payments/billing-orphaned.queue.module';
import { BillingTrialsQueueModule } from './queues/billing/billing-expired-trials/billing-trials.queue.module';
import { KpiDigestQueueModule } from './queues/analytics/kpi-digest/kpi-digest.queue.module';
import { PeriodicReportQueueModule } from './queues/analytics/periodic-report/periodic-report.queue.module';
import { DailyReportRemindersQueueModule } from './queues/daily-report/daily-report-reminders/daily-report-reminders.queue.module';
import { CampaignQueueModule } from './queues/notification/campaign/campaign.queue.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConnectConfig,
    }),
    BullModule.registerQueue(...buildQueueConfig()),
    // Feature queue modules
    BillingExpiredQueueModule,
    BillingRenewalQueueModule,
    BillingOrphanedQueueModule,
    BillingTrialsQueueModule,
    KpiDigestQueueModule,
    PeriodicReportQueueModule,
    DailyReportRemindersQueueModule,
    CampaignQueueModule,
  ],
  exports: [
    BullModule,
    BillingExpiredQueueModule,
    BillingRenewalQueueModule,
    BillingOrphanedQueueModule,
    BillingTrialsQueueModule,
    KpiDigestQueueModule,
    PeriodicReportQueueModule,
    DailyReportRemindersQueueModule,
    CampaignQueueModule,
  ],
})
export class BullQueueModule {}
