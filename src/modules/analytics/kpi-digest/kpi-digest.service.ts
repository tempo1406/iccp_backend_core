import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { OrgSettings } from '@modules/organization/settings/entities/org-settings.entity';
import { MaillerService } from '@modules/mail/mail.service';
import {
  PeriodicReportRecipientGroup,
  PeriodicReportScope,
} from '@modules/organization/settings/constants/periodic-report-settings.constant';
import { PeriodicReportBuilderService } from '@modules/analytics/periodic-report/domain/periodic-report-builder.service';
import { PeriodicReportPeriodService } from '@modules/analytics/periodic-report/domain/periodic-report-period.service';
import { PeriodicReportRecipientResolver } from '@modules/analytics/periodic-report/domain/periodic-report-recipient-resolver.service';
import { PeriodicReportSummarySnapshot } from '@modules/analytics/periodic-report/domain/types/periodic-report.types';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { DEFAULT_TIMEZONE } from '@common/constants/timezone.constant';

const DIGEST_SCOPES = [
  PeriodicReportScope.ORG_SUMMARY,
  PeriodicReportScope.PROJECT_SUMMARY,
  PeriodicReportScope.MEMBER_KPI,
];

@Injectable()
export class KpiDigestService {
  private readonly logger = new Logger(KpiDigestService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(OrgSettings)
    private readonly orgSettingsRepo: Repository<OrgSettings>,
    private readonly builderService: PeriodicReportBuilderService,
    private readonly periodService: PeriodicReportPeriodService,
    private readonly recipientResolver: PeriodicReportRecipientResolver,
    private readonly mailService: MaillerService,
    private readonly notificationCoreService: NotificationCoreService,
  ) {}

  async dispatchDueDigests(): Promise<void> {
    const settingsRows = await this.orgSettingsRepo.find({
      where: { digestEnabled: true },
    });
    if (!settingsRows.length) return;

    const organizations = await this.organizationRepo.find({
      where: {
        id: In(settingsRows.map((s) => s.organizationId)),
        isActive: true,
      },
    });
    const orgMap = new Map(organizations.map((o) => [o.id, o]));

    for (const settings of settingsRows) {
      const org = orgMap.get(settings.organizationId);
      if (!org) continue;

      try {
        await this.maybeDispatchDigest(org, settings);
      } catch (error) {
        this.logger.error(
          `KPI digest failed for org ${org.id}: ${String(error)}`,
        );
      }
    }
  }

  private async maybeDispatchDigest(
    org: Organization,
    settings: OrgSettings,
  ): Promise<void> {
    const now = new Date();
    const tz = this.periodService.normalizeTimeZone(DEFAULT_TIMEZONE);
    const local = this.getLocalParts(now, tz);
    const localIsoDay = this.toIsoDay(local.year, local.month, local.day);

    if (localIsoDay !== (settings.digestDay ?? 1)) return;

    const [sendHour, sendMinute] = this.periodService.parseSendTime(
      settings.digestTime ?? '08:00',
    );
    if (
      local.hour < sendHour ||
      (local.hour === sendHour && local.minute < sendMinute)
    ) {
      return;
    }

    // Skip if already sent this week (since Monday 00:00 in org timezone)
    if (settings.lastDigestSentAt) {
      const weekMondayUtc = this.getWeekMondayUtc(
        local.year,
        local.month,
        local.day,
        localIsoDay,
        tz,
      );
      if (settings.lastDigestSentAt >= weekMondayUtc) return;
    }

    await this.sendDigest(org, settings, now, tz);
  }

  private async sendDigest(
    org: Organization,
    settings: OrgSettings,
    now: Date,
    tz: string,
  ): Promise<void> {
    const { periodStart, periodEnd, periodLabel } = this.buildWeekPeriod(
      now,
      tz,
    );

    const snapshot = await this.builderService.buildSnapshot({
      organization: org,
      periodKey: `DIGEST-${periodStart}`,
      periodStart,
      periodEnd,
      timeZone: tz,
      scopes: DIGEST_SCOPES,
    });

    const groups = (
      settings.digestRecipients?.length
        ? settings.digestRecipients
        : ['org_admin']
    ) as PeriodicReportRecipientGroup[];

    const recipients = await this.recipientResolver.resolveRecipients(
      org,
      groups,
      [],
    );
    const channels = new Set(
      (settings.digestChannels?.length
        ? settings.digestChannels
        : ['email', 'in_app']
      ).map((channel) => channel.trim().toLowerCase()),
    );

    if (!recipients.length) {
      this.logger.warn(`No digest recipients for org ${org.id}`);
      return;
    }
    if (!channels.has('email') && !channels.has('in_app')) {
      this.logger.warn(`No supported digest channels configured for org ${org.id}`);
      return;
    }

    const context = this.buildEmailContext(org.name, periodLabel, snapshot);
    let deliveredRecipientCount = 0;

    for (const recipient of recipients) {
      let delivered = false;

      if (channels.has('email')) {
        try {
          await this.mailService.sendKpiDigestEmail({
            email: recipient.email,
            recipientName: recipient.displayName || recipient.email,
            organizationName: org.name,
            periodLabel,
            context,
          });
          delivered = true;
        } catch (error) {
          this.logger.warn(
            `Failed to send digest email to ${recipient.email}: ${String(error)}`,
          );
        }
      }

      if (channels.has('in_app') && recipient.userId) {
        try {
          const notification = await this.notificationCoreService.send({
            userId: recipient.userId,
            type: 'kpi_digest',
            title: `Weekly KPI Digest: ${periodLabel}`,
            message: `Your weekly KPI digest for ${org.name} is ready.`,
            data: {
              module: 'analytics',
              action: 'weekly_kpi_digest',
              organizationId: org.id,
              organizationName: org.name,
              periodStart,
              periodEnd,
              periodLabel,
            },
            idempotencyKey: `kpi-digest:${org.id}:${periodStart}:${recipient.userId}`,
          });
          delivered = delivered || notification !== null;
        } catch (error) {
          this.logger.warn(
            `Failed to send in-app digest to user ${recipient.userId}: ${String(error)}`,
          );
        }
      } else if (channels.has('in_app') && !recipient.userId) {
        this.logger.warn(
          `Skipping in-app digest for recipient ${recipient.email} because no userId was resolved`,
        );
      }

      if (delivered) {
        deliveredRecipientCount += 1;
      }
    }

    if (deliveredRecipientCount === 0) {
      this.logger.warn(
        `KPI digest delivery failed for org ${org.id} (${periodLabel}); lastDigestSentAt was not updated`,
      );
      return;
    }

    await this.orgSettingsRepo.update(
      { organizationId: org.id },
      { lastDigestSentAt: now },
    );

    this.logger.log(
      `KPI digest sent for org ${org.id} (${periodLabel}), ${deliveredRecipientCount}/${recipients.length} recipients`,
    );
  }

  private buildWeekPeriod(
    now: Date,
    tz: string,
  ): { periodStart: string; periodEnd: string; periodLabel: string } {
    const local = this.getLocalParts(now, tz);
    const isoDay = this.toIsoDay(local.year, local.month, local.day);

    // periodEnd = yesterday
    const periodEndDate = new Date(
      Date.UTC(local.year, local.month - 1, local.day - 1),
    );
    // periodStart = 6 days before periodEnd (7-day window)
    const periodStartDate = new Date(
      Date.UTC(
        periodEndDate.getUTCFullYear(),
        periodEndDate.getUTCMonth(),
        periodEndDate.getUTCDate() - 6,
      ),
    );

    const periodStart = periodStartDate.toISOString().slice(0, 10);
    const periodEnd = periodEndDate.toISOString().slice(0, 10);
    const periodLabel = `${this.formatDate(periodStart)} – ${this.formatDate(periodEnd)}`;

    void isoDay; // used upstream
    return { periodStart, periodEnd, periodLabel };
  }

  private buildEmailContext(
    organizationName: string,
    periodLabel: string,
    snapshot: PeriodicReportSummarySnapshot,
  ): Record<string, unknown> {
    const org = snapshot.orgSummary;
    const headlineMetrics = org
      ? [
          { label: 'Total Tasks', value: org.totalTasks },
          { label: 'Completed Tasks', value: org.completedTasks },
          {
            label: 'Completion Rate',
            value: this.formatPercent(org.completionRate),
          },
          {
            label: 'On-Time Rate',
            value: this.formatPercent(org.onTimeRate),
          },
          { label: 'Overdue Tasks', value: org.overdueTasks },
          { label: 'Active Members', value: org.activeMembers },
          { label: 'Active Projects', value: org.activeProjects },
        ]
      : [];

    const topProjects = snapshot.projectSummary
      .slice(0, 5)
      .map((p) => ({
        projectName: p.projectName,
        status: p.status,
        performanceScore: p.performanceScore.toFixed(2),
        onTimeRate: this.formatPercent(p.onTimeRate),
        riskLevel: p.riskLevel,
      }));

    const topMembers = snapshot.memberKpi
      .slice(0, 10)
      .map((m) => ({
        fullName: m.fullName,
        completedTasks: m.completedTasks,
        performanceScore: m.performanceScore.toFixed(2),
        onTimeRate: this.formatPercent(m.onTimeRate),
        overdueRate: this.formatPercent(m.overdueRate),
      }));

    return {
      organizationName,
      periodLabel,
      generatedAt: new Date().toISOString(),
      headlineMetrics,
      topProjects,
      topMembers,
      year: new Date().getFullYear(),
    };
  }

  private getWeekMondayUtc(
    year: number,
    month: number,
    day: number,
    isoDay: number,
    tz: string,
  ): Date {
    const daysFromMonday = isoDay - 1;
    const mondayDate = new Date(
      Date.UTC(year, month - 1, day - daysFromMonday),
    );
    const mondayStr = mondayDate.toISOString().slice(0, 10);
    return this.periodService.zonedDateTimeToUtc(mondayStr, tz, 0, 0);
  }

  private getLocalParts(
    date: Date,
    tz: string,
  ): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(date);

    const values = Object.fromEntries(
      parts
        .filter((p) => p.type !== 'literal')
        .map((p) => [p.type, Number(p.value)]),
    );

    return {
      year: values.year,
      month: values.month,
      day: values.day,
      hour: values.hour,
      minute: values.minute,
    };
  }

  private toIsoDay(year: number, month: number, day: number): number {
    const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return jsDay === 0 ? 7 : jsDay; // 1=Mon ... 7=Sun
  }

  private formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${months[month - 1]} ${day}, ${year}`;
  }

  private formatPercent(value: number): string {
    return `${Number(value ?? 0).toFixed(1)}%`;
  }
}
