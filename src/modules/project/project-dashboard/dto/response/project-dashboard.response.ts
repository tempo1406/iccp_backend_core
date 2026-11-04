import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardCardsResponse {
  @ApiProperty() completedLast7Days: number;
  @ApiProperty() updatedLast7Days: number;
  @ApiProperty() createdLast7Days: number;
  @ApiProperty() dueSoonCount: number;
}

export class TaskByStatusResponse {
  @ApiProperty() statusId: string;
  @ApiProperty() statusName: string;
  @ApiProperty() orderIndex: number;
  @ApiProperty() count: number;
}

export class ActiveTaskResponse {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() slug?: string;
  @ApiProperty() priority: string;
  @ApiPropertyOptional() statusId?: string;
  @ApiPropertyOptional() statusName?: string;
  @ApiPropertyOptional() assignedTo?: string;
  @ApiPropertyOptional() assigneeName?: string;
  @ApiPropertyOptional() dueDate?: Date;
  @ApiProperty() dueState: string;
  @ApiProperty() updatedAt: Date;
}

export class TaskByPriorityResponse {
  @ApiProperty() priority: string;
  @ApiProperty() count: number;
}

export class TaskByTypeResponse {
  @ApiProperty() type: string;
  @ApiProperty() count: number;
}

export class WorkloadMemberStatusResponse {
  @ApiProperty() statusId: string;
  @ApiProperty() statusName: string;
  @ApiProperty() count: number;
}

export class WorkloadMemberResponse {
  @ApiProperty() userId: string;
  @ApiPropertyOptional() fullName?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() avatar?: string;
  @ApiProperty() totalTasks: number;
  @ApiProperty({ type: [WorkloadMemberStatusResponse] })
  tasksByStatus: WorkloadMemberStatusResponse[];
}

export class WorkloadResponse {
  @ApiProperty() unassignedCount: number;
  @ApiProperty({ type: [WorkloadMemberResponse] }) members: WorkloadMemberResponse[];
}

export class MemberRoleStatResponse {
  @ApiProperty() roleId: string;
  @ApiProperty() roleName: string;
  @ApiProperty() count: number;
}

export class MemberStatsResponse {
  @ApiProperty() total: number;
  @ApiProperty({ type: [MemberRoleStatResponse] }) byRole: MemberRoleStatResponse[];
}

export class ProjectDashboardResponse {
  @ApiProperty({ type: DashboardCardsResponse })
  cards: DashboardCardsResponse;

  @ApiProperty({ type: [TaskByStatusResponse] })
  tasksByStatus: TaskByStatusResponse[];

  @ApiProperty({ type: [ActiveTaskResponse] })
  activeTasks: ActiveTaskResponse[];

  @ApiProperty({ type: [TaskByPriorityResponse] })
  tasksByPriority: TaskByPriorityResponse[];

  @ApiProperty({ type: [TaskByTypeResponse] })
  tasksByType: TaskByTypeResponse[];

  @ApiProperty({ type: WorkloadResponse })
  workload: WorkloadResponse;

  @ApiProperty({ type: MemberStatsResponse })
  memberStats: MemberStatsResponse;
}
