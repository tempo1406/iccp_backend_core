export class OrgMemberKpiResponse {
  userId: string;
  fullName?: string;
  email?: string;
  avatar?: string;

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

  // Ticket summary
  totalTickets: number;
  pendingTickets: number;
  approvedTickets: number;
  rejectedTickets: number;
}
