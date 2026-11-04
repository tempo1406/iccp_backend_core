import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { OrgHoliday } from '@modules/organization/working-time/entities/org-holiday.entity';
import { WorkingTimeModule } from '@modules/organization/working-time/working-time.module';
import { OrgSettings } from '@modules/organization/settings/entities/org-settings.entity';
import { OrgSettingsModule } from '@modules/organization/settings/org-settings.module';
import { Project } from '@modules/project/core/entities/project.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Task } from '@modules/project/task-management/entities/task.entity';
import { TicketRequest } from '@modules/ticket-request/core/entities/ticket-request.entity';
import { User } from '@modules/users/entities/user.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { KpiActualModule } from '@modules/analytics/kpi-actual.module';
import { KpiSettingsResolverModule } from '@modules/analytics/kpi-settings-resolver.module';
import { MaillerModule } from '@modules/mail/mail.module';
import { ImagekitModule } from '@modules/imagekit/imagekit.module';
import { NotificationCoreModule } from '@modules/notification/core/notification-core.module';
import { ReportRun } from './entities/report-run.entity';
import { ReportDeliveryAttempt } from './entities/report-delivery-attempt.entity';
import { PeriodicReportController } from './periodic-report.controller';
import { PeriodicReportPeriodService } from './domain/periodic-report-period.service';
import { PeriodicReportBuilderService } from './domain/periodic-report-builder.service';
import { PeriodicReportCsvService } from './domain/periodic-report-csv.service';
import { PeriodicReportXlsxService } from './domain/periodic-report-xlsx.service';
import { PeriodicReportRecipientResolver } from './domain/periodic-report-recipient-resolver.service';
import { PeriodicReportMailService } from './domain/periodic-report-mail.service';
import { PeriodicReportService } from './application/periodic-report.service';
import { PeriodicReportScheduleService } from './application/periodic-report-schedule.service';
import { PeriodicReportDispatchService } from './application/periodic-report-dispatch.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportRun,
      ReportDeliveryAttempt,
      Organization,
      OrganizationMember,
      OrgHoliday,
      OrgSettings,
      Project,
      ProjectMember,
      Task,
      TicketRequest,
      User,
      UserRole,
      Role,
    ]),
    OrgSettingsModule,
    WorkingTimeModule,
    KpiActualModule,
    KpiSettingsResolverModule,
    MaillerModule,
    ImagekitModule,
    NotificationCoreModule,
  ],
  controllers: [PeriodicReportController],
  providers: [
    PeriodicReportPeriodService,
    PeriodicReportBuilderService,
    PeriodicReportCsvService,
    PeriodicReportXlsxService,
    PeriodicReportRecipientResolver,
    PeriodicReportMailService,
    PeriodicReportService,
    PeriodicReportScheduleService,
    PeriodicReportDispatchService,
  ],
  exports: [PeriodicReportService],
})
export class PeriodicReportModule {}
