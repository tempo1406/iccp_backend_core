import { Module } from '@nestjs/common';
import { ProjectKpiModule } from './project-kpi/project-kpi.module';
import { OrgKpiModule } from './org-kpi/org-kpi.module';
import { KpiTargetModule } from './kpi-target/kpi-target.module';
import { PeriodicReportModule } from './periodic-report/periodic-report.module';
import { KpiDigestModule } from './kpi-digest/kpi-digest.module';

@Module({
  imports: [
    ProjectKpiModule,
    OrgKpiModule,
    KpiTargetModule,
    PeriodicReportModule,
    KpiDigestModule,
  ],
})
export class AnalyticsModule {}
