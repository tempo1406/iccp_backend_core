import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { OrgSettings } from '@modules/organization/settings/entities/org-settings.entity';
import { OrgHoliday } from '@modules/organization/working-time/entities/org-holiday.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Task } from '@modules/project/task-management/entities/task.entity';
import { TicketRequest } from '@modules/ticket-request/core/entities/ticket-request.entity';
import { User } from '@modules/users/entities/user.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { WorkingTimeModule } from '@modules/organization/working-time/working-time.module';
import { KpiActualModule } from '@modules/analytics/kpi-actual.module';
import { KpiSettingsResolverModule } from '@modules/analytics/kpi-settings-resolver.module';
import { MaillerModule } from '@modules/mail/mail.module';
import { NotificationCoreModule } from '@modules/notification/core/notification-core.module';
import { PeriodicReportPeriodService } from '@modules/analytics/periodic-report/domain/periodic-report-period.service';
import { PeriodicReportBuilderService } from '@modules/analytics/periodic-report/domain/periodic-report-builder.service';
import { PeriodicReportRecipientResolver } from '@modules/analytics/periodic-report/domain/periodic-report-recipient-resolver.service';
import { KpiDigestService } from './kpi-digest.service';
import { KpiDigestScheduleService } from './kpi-digest-schedule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      OrgSettings,
      OrgHoliday,
      Project,
      ProjectMember,
      Task,
      TicketRequest,
      User,
      UserRole,
      Role,
    ]),
    WorkingTimeModule,
    KpiActualModule,
    KpiSettingsResolverModule,
    MaillerModule,
    NotificationCoreModule,
  ],
  providers: [
    PeriodicReportPeriodService,
    PeriodicReportBuilderService,
    PeriodicReportRecipientResolver,
    KpiDigestService,
    KpiDigestScheduleService,
  ],
  exports: [KpiDigestService],
})
export class KpiDigestModule {}
