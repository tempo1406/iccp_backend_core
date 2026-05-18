import { ProjectMemberKpiResponse } from './project-member-kpi.response';

export class RecentTaskItem {
  taskId: string;
  title: string;
  slug?: string;
  statusName: string;
  priority: string;
  estimatedPoint?: number;
  estimatedHours?: number;
  dueDate?: Date;
  dueState: string;
  completedAt?: Date;
}

export class ProjectMemberKpiDetailResponse extends ProjectMemberKpiResponse {
  tasksByPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  pointsByPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  recentTasks: RecentTaskItem[];
}
