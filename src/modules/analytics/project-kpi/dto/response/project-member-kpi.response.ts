export class ProjectMemberKpiResponse {
  userId: string;
  fullName?: string;
  email?: string;
  avatar?: string;

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
  completedEstimatedHours?: number;
  allocatedHoursPerDay?: number;
  expectedWorkingHours?: number;

  approvedOtTickets: number;
  totalOtHours: number;
  effectiveOtHours: number;

  completionRate: number;
  onTimeRate: number;
  overdueRate: number;
  performanceScore: number;

  target?: {
    id: string;
    period: string;
    periodStart: string;
    periodEnd: string;
    targetScore?: number;
    targetPointCompletionRate?: number;
    targetOnTimeRate?: number;
    targetOtHours?: number;
    targetCompletedTasks?: number;
    maxOverdueTasks?: number;
    requireZeroOverdue: boolean;
  };

  achievement?: {
    score?: number;
    onTimeRate?: number;
    pointCompletionRate?: number;
    otHours?: number;
    completedTasks?: number;
  };

  achievementAdjustment?: {
    completedTasksFactor?: number;
    adjustedByCompletedTasksTarget: boolean;
  };

  achievementRate?: number;
}
