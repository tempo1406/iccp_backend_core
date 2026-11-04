import { Injectable } from '@nestjs/common';
import { PeriodicReportScope } from '@modules/organization/settings/constants/periodic-report-settings.constant';
import {
  PeriodicMemberKpiItem,
  PeriodicProjectSummaryItem,
  PeriodicReportSummarySnapshot,
} from './types/periodic-report.types';

export type PeriodicReportCsvArtifact = {
  artifactType: PeriodicReportScope;
  fileName: string;
  mimeType: string;
  content: Buffer;
};

@Injectable()
export class PeriodicReportCsvService {
  buildArtifacts(
    snapshot: PeriodicReportSummarySnapshot,
  ): PeriodicReportCsvArtifact[] {
    const artifacts: PeriodicReportCsvArtifact[] = [];

    if (snapshot.orgSummary) {
      artifacts.push({
        artifactType: PeriodicReportScope.ORG_SUMMARY,
        fileName: 'org-summary.csv',
        mimeType: 'text/csv',
        content: this.toCsvBuffer([
          {
            periodKey: snapshot.periodKey,
            periodStart: snapshot.periodStart,
            periodEnd: snapshot.periodEnd,
            organizationName: snapshot.orgSummary.organizationName,
            totalMembers: snapshot.orgSummary.totalMembers,
            activeMembers: snapshot.orgSummary.activeMembers,
            totalProjects: snapshot.orgSummary.totalProjects,
            activeProjects: snapshot.orgSummary.activeProjects,
            completedProjects: snapshot.orgSummary.completedProjects,
            onHoldProjects: snapshot.orgSummary.onHoldProjects,
            cancelledProjects: snapshot.orgSummary.cancelledProjects,
            totalTasks: snapshot.orgSummary.totalTasks,
            completedTasks: snapshot.orgSummary.completedTasks,
            overdueTasks: snapshot.orgSummary.overdueTasks,
            totalEstimatePoints: snapshot.orgSummary.totalEstimatePoints,
            totalActualPoints: snapshot.orgSummary.totalActualPoints,
            completionRate: snapshot.orgSummary.completionRate,
            pointCompletionRate: snapshot.orgSummary.pointCompletionRate,
            onTimeRate: snapshot.orgSummary.onTimeRate,
            totalTickets: snapshot.orgSummary.totalTickets,
            pendingTickets: snapshot.orgSummary.pendingTickets,
            approvedTickets: snapshot.orgSummary.approvedTickets,
            rejectedTickets: snapshot.orgSummary.rejectedTickets,
            totalApprovedOtTickets: snapshot.orgSummary.totalApprovedOtTickets,
            totalOtHours: snapshot.orgSummary.totalOtHours,
          },
        ]),
      });
    }

    if (snapshot.projectSummary.length > 0) {
      artifacts.push({
        artifactType: PeriodicReportScope.PROJECT_SUMMARY,
        fileName: 'project-summary.csv',
        mimeType: 'text/csv',
        content: this.toCsvBuffer(
          snapshot.projectSummary.map((item) =>
            this.toProjectSummaryCsvRow(item),
          ),
        ),
      });
    }

    if (snapshot.memberKpi.length > 0) {
      artifacts.push({
        artifactType: PeriodicReportScope.MEMBER_KPI,
        fileName: 'member-kpi.csv',
        mimeType: 'text/csv',
        content: this.toCsvBuffer(
          snapshot.memberKpi.map((item) => this.toMemberKpiCsvRow(item)),
        ),
      });
    }

    return artifacts;
  }

  private toProjectSummaryCsvRow(item: PeriodicProjectSummaryItem) {
    return {
      projectName: item.projectName,
      status: item.status,
      priority: item.priority,
      memberCount: item.memberCount,
      totalAssigned: item.totalAssigned,
      completedTasks: item.completedTasks,
      openTasks: item.openTasks,
      onTimeTasks: item.onTimeTasks,
      lateTasks: item.lateTasks,
      overdueTasks: item.overdueTasks,
      totalEstimatePoints: item.totalEstimatePoints,
      totalActualPoints: item.totalActualPoints,
      totalEstimatedHours: item.totalEstimatedHours,
      approvedOtTickets: item.approvedOtTickets,
      totalOtHours: item.totalOtHours,
      effectiveOtHours: item.effectiveOtHours,
      completionRate: item.completionRate,
      pointCompletionRate: item.pointCompletionRate,
      onTimeRate: item.onTimeRate,
      overdueRate: item.overdueRate,
      performanceScore: item.performanceScore,
      riskLevel: item.riskLevel,
    };
  }

  private toMemberKpiCsvRow(item: PeriodicMemberKpiItem) {
    return {
      fullName: item.fullName,
      email: item.email ?? '',
      projectCount: item.projectCount,
      activeProjectCount: item.activeProjectCount,
      totalAssigned: item.totalAssigned,
      completedTasks: item.completedTasks,
      openTasks: item.openTasks,
      onTimeTasks: item.onTimeTasks,
      lateTasks: item.lateTasks,
      overdueTasks: item.overdueTasks,
      dueSoonTasks: item.dueSoonTasks,
      totalEstimatePoints: item.totalEstimatePoints,
      totalActualPoints: item.totalActualPoints,
      totalEstimatedHours: item.totalEstimatedHours,
      expectedWorkingHours: item.expectedWorkingHours,
      approvedOtTickets: item.approvedOtTickets,
      totalOtHours: item.totalOtHours,
      effectiveOtHours: item.effectiveOtHours,
      completionRate: item.completionRate,
      pointCompletionRate: item.pointCompletionRate,
      onTimeRate: item.onTimeRate,
      overdueRate: item.overdueRate,
      performanceScore: item.performanceScore,
    };
  }

  private toCsvBuffer(rows: Array<Record<string, unknown>>): Buffer {
    if (!rows.length) {
      return Buffer.from('', 'utf-8');
    }

    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const lines = [
      headers.map((header) => this.escapeCell(header)).join(','),
      ...rows.map((row) =>
        headers.map((header) => this.escapeCell(row[header])).join(','),
      ),
    ];

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private escapeCell(value: unknown): string {
    if (value == null) {
      return '';
    }

    const normalized =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    const escaped = normalized.replace(/"/g, '""');
    return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
  }
}
