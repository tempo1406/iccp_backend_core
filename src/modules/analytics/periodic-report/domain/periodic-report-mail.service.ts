import { Injectable } from '@nestjs/common';
import { MaillerService } from '@modules/mail/mail.service';
import * as nodemailer from 'nodemailer';
import {
  PeriodicReportMetricItem,
  PeriodicProjectSummaryItem,
  PeriodicMemberKpiItem,
  PeriodicReportSummarySnapshot,
} from './types/periodic-report.types';
import { PeriodicReportPeriodService } from './periodic-report-period.service';
import { ReportFrequency } from './constants/periodic-report.constant';

type MailAttachments = NonNullable<nodemailer.SendMailOptions['attachments']>;

@Injectable()
export class PeriodicReportMailService {
  constructor(
    private readonly maillerService: MaillerService,
    private readonly periodService: PeriodicReportPeriodService,
  ) {}

  async sendPeriodicReport(payload: {
    email: string;
    recipientName: string;
    organizationName: string;
    frequency: ReportFrequency;
    snapshot: PeriodicReportSummarySnapshot;
    attachments: MailAttachments;
  }): Promise<void> {
    const periodLabel = this.periodService.formatPeriodLabel(
      payload.frequency,
      payload.snapshot.periodKey,
      payload.snapshot.periodStart,
      payload.snapshot.periodEnd,
    );

    await this.maillerService.sendPeriodicReportEmail({
      email: payload.email,
      subject: `Periodic Report ${payload.snapshot.periodKey} - ${payload.organizationName}`,
      attachments: payload.attachments,
      context: {
        recipientName: payload.recipientName,
        organizationName: payload.organizationName,
        periodLabel,
        generatedAt: payload.snapshot.generatedAt,
        headlineMetrics: this.buildHeadlineMetrics(payload.snapshot),
        projectSectionTitle: this.buildProjectSectionTitle(payload.snapshot),
        topProjects: this.buildProjectSectionItems(payload.snapshot),
        topMembers: payload.snapshot.memberKpi.slice(0, 10).map((item) =>
          this.formatMember(item),
        ),
      },
    });
  }

  private buildHeadlineMetrics(
    snapshot: PeriodicReportSummarySnapshot,
  ): PeriodicReportMetricItem[] {
    if (!snapshot.orgSummary) return [];

    return [
      { label: 'Total Tasks', value: snapshot.orgSummary.totalTasks },
      { label: 'Completed Tasks', value: snapshot.orgSummary.completedTasks },
      { label: 'Overdue Tasks', value: snapshot.orgSummary.overdueTasks },
      { label: 'On-time Rate', value: `${snapshot.orgSummary.onTimeRate}%` },
      {
        label: 'Point Completion',
        value: `${snapshot.orgSummary.pointCompletionRate}%`,
      },
      {
        label: 'Approved OT',
        value: `${snapshot.orgSummary.totalOtHours} hours`,
      },
      { label: 'Total Tickets', value: snapshot.orgSummary.totalTickets },
      { label: 'Total Projects', value: snapshot.orgSummary.totalProjects },
    ];
  }

  private formatProject(item: PeriodicProjectSummaryItem) {
    return {
      projectName: item.projectName,
      status: item.status,
      performanceScore: item.performanceScore,
      onTimeRate: `${item.onTimeRate}%`,
      completionRate: `${item.completionRate}%`,
      overdueTasks: item.overdueTasks,
      riskLevel: item.riskLevel,
    };
  }

  private formatMember(item: PeriodicMemberKpiItem) {
    return {
      fullName: item.fullName,
      email: item.email ?? '',
      performanceScore: item.performanceScore,
      completionRate: `${item.completionRate}%`,
      onTimeRate: `${item.onTimeRate}%`,
      totalAssigned: item.totalAssigned,
      totalOtHours: item.totalOtHours,
    };
  }

  private buildProjectSectionTitle(
    snapshot: PeriodicReportSummarySnapshot,
  ): string {
    return snapshot.projectScopeIds?.length
      ? 'Projects You Manage'
      : 'Top 5 Highlighted Projects';
  }

  private buildProjectSectionItems(snapshot: PeriodicReportSummarySnapshot) {
    const projects = snapshot.projectScopeIds?.length
      ? snapshot.projectSummary
      : snapshot.projectSummary.slice(0, 5);
    return projects.map((item) => this.formatProject(item));
  }
}
