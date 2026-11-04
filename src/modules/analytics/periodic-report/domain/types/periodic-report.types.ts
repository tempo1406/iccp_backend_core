import {
  PeriodicReportRecipientGroup,
  PeriodicReportScope,
} from '@modules/organization/settings/constants/periodic-report-settings.constant';

export type PeriodicReportRecipient = {
  email: string;
  displayName: string;
  userId?: string;
  sources: PeriodicReportRecipientGroup[];
  managedProjectIds?: string[];
};

export type PeriodicReportMetricItem = {
  label: string;
  value: string | number;
};

export type PeriodicOrgSummary = {
  organizationId: string;
  organizationName: string;
  totalMembers: number;
  activeMembers: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  cancelledProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalEstimatePoints: number;
  totalActualPoints: number;
  completionRate: number;
  pointCompletionRate: number;
  onTimeRate: number;
  totalTickets: number;
  pendingTickets: number;
  approvedTickets: number;
  rejectedTickets: number;
  totalApprovedOtTickets: number;
  totalOtHours: number;
};

export type PeriodicProjectSummaryItem = {
  projectId: string;
  projectName: string;
  status: string;
  priority: string;
  memberCount: number;
  totalAssigned: number;
  completedTasks: number;
  openTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  overdueTasks: number;
  totalEstimatePoints: number;
  totalActualPoints: number;
  totalEstimatedHours: number;
  approvedOtTickets: number;
  totalOtHours: number;
  effectiveOtHours: number;
  completionRate: number;
  pointCompletionRate: number;
  onTimeRate: number;
  overdueRate: number;
  performanceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
};

export type PeriodicMemberKpiItem = {
  userId: string;
  fullName: string;
  email?: string;
  projectCount: number;
  activeProjectCount: number;
  totalAssigned: number;
  completedTasks: number;
  openTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  totalEstimatePoints: number;
  totalActualPoints: number;
  totalEstimatedHours?: number;
  expectedWorkingHours?: number;
  approvedOtTickets: number;
  totalOtHours: number;
  effectiveOtHours: number;
  completionRate: number;
  pointCompletionRate: number;
  onTimeRate: number;
  overdueRate: number;
  performanceScore: number;
};

export type PeriodicReportSnapshotContent = {
  reportType: 'periodic';
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  timeZone: string;
  generatedAt: string;
  scopes: PeriodicReportScope[];
  projectScopeIds?: string[];
  orgSummary?: PeriodicOrgSummary;
  projectSummary: PeriodicProjectSummaryItem[];
  memberKpi: PeriodicMemberKpiItem[];
};

export type PeriodicReportSummarySnapshot = PeriodicReportSnapshotContent & {
  scopedSnapshots?: Record<string, PeriodicReportSnapshotContent>;
};

export type PeriodicReportArtifact = {
  artifactType: PeriodicReportScope;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  scopeKey?: string;
  scopeType?: 'organization' | 'project_manager';
  scopeLabel?: string;
  projectIds?: string[];
  artifactVersion?: string;
};
