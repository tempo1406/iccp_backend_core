export class OrgMemberKpiAggregateResponse {
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
  openPoints: number;
  pointCompletionRate: number;
  totalEstimatedHours?: number;
  expectedWorkingHours?: number;
  approvedOtTickets: number;
  totalOtHours: number;
  effectiveOtHours: number;
  completionRate: number;
  onTimeRate: number;
  overdueRate: number;
  performanceScore: number;
}

export class OrgMemberKpiByProjectResponse {
  projectId: string;
  projectName: string;
  projectStatus: string;
  totalAssigned: number;
  completedTasks: number;
  openTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  overdueTasks: number;
  totalEstimatePoints: number;
  totalActualPoints: number;
  openPoints: number;
  pointCompletionRate: number;
  completionRate: number;
  onTimeRate: number;
  overdueRate: number;
  performanceScore: number;
}

export class OrgMemberOtSummaryResponse {
  approvedOtTickets: number;
  totalOtHours: number;
  effectiveOtHours: number;
  breakdown: Array<{
    ticketId: string;
    ticketCode: string;
    projectName?: string;
    date: string;
    hours: number;
    multiplier: number;
    effectiveHours: number;
  }>;
}

export class OrgMemberTicketSummaryResponse {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  byType: {
    leave: number;
    wfh: number;
    overtime: number;
    advance: number;
    general: number;
  };
}

export class OrgMemberKpiDetailResponse {
  userId: string;
  fullName?: string;
  email?: string;
  avatar?: string;
  aggregate: OrgMemberKpiAggregateResponse;
  byProject: OrgMemberKpiByProjectResponse[];
  ot: OrgMemberOtSummaryResponse;
  tickets: OrgMemberTicketSummaryResponse;
}
