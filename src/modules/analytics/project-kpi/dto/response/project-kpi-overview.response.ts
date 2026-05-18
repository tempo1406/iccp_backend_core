export class ProjectKpiOverviewResponse {
  projectId: string;
  projectName: string;
  status: string;
  priority: string;
  startDate?: Date;
  endDate?: Date;
  daysRemaining?: number;
  progress: number;
  isPointComplete: boolean;

  // Task counts
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;

  // Points
  projectTotalEstimatePoints: number;
  projectTotalActualPoints: number;
  projectOpenPoints: number;
  pointBasedProgress: number;

  // Hours
  totalEstimatedHours?: number;
  completedEstimatedHours?: number;

  // Rates
  completionRate: number;
  pointCompletionRate: number;
  onTimeRate: number;
  overdueRate: number;

  // Members
  totalMembers: number;
  activeMembers: number;
}
