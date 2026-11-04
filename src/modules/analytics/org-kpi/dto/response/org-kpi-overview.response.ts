export class OrgKpiOverviewResponse {
  organizationId: string;

  totalMembers: number;
  activeMembers: number;

  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  cancelledProjects: number;
  avgProjectProgress: number;

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
  avgTicketResolutionHours?: number;

  totalApprovedOtTickets: number;
  totalOtHours: number;
}
