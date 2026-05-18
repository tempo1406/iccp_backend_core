import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KpiTargetPeriod } from '@modules/analytics/kpi-target/enums/kpi-target.enum';
import {
  ProjectBudgetCurrency,
  ProjectStatus,
} from '@modules/project/core/entities/project.entity';
import { TaskDueState } from '@modules/project/task-management/dto/response/task.response';
import {
  TicketRequestStatus,
  TicketRequestType,
} from '@modules/ticket-request/core/entities/ticket-request.entity';

export class TenantDashboardViewerResponse {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ enum: ['org_admin', 'member'] })
  roleVariant: 'org_admin' | 'member';
}

export class TenantDashboardHeroResponse {
  @ApiProperty()
  greetingName: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty()
  unreadNotifications: number;

  @ApiProperty()
  unreadChat: number;

  @ApiProperty()
  pendingActions: number;
}

export class TenantDashboardOrgKpiSnapshotResponse {
  @ApiProperty()
  totalMembers: number;

  @ApiProperty()
  activeMembers: number;

  @ApiProperty()
  activeProjects: number;

  @ApiProperty()
  completionRate: number;

  @ApiProperty()
  pendingTickets: number;

  @ApiProperty()
  totalOtHours: number;
}

export class TenantDashboardInvitationSummaryResponse {
  @ApiProperty()
  pending: number;

  @ApiProperty()
  needsAttention: number;

  @ApiProperty()
  acceptanceRate: number;
}

export class TenantDashboardDocumentHealthResponse {
  @ApiProperty()
  total: number;

  @ApiProperty()
  indexed: number;

  @ApiProperty()
  processing: number;

  @ApiProperty()
  failed: number;
}

export class TenantDashboardApprovalQueueResponse {
  @ApiProperty()
  pendingTickets: number;

  @ApiProperty()
  processingDocuments: number;

  @ApiProperty()
  failedDocuments: number;
}

export class TenantDashboardProjectPortfolioResponse {
  @ApiProperty()
  total: number;

  @ApiProperty()
  active: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  onHold: number;
}

export class TenantDashboardProjectBudgetSummaryResponse {
  @ApiProperty({ enum: ProjectBudgetCurrency })
  currency: ProjectBudgetCurrency;

  @ApiProperty()
  estimatedTotal: number;

  @ApiProperty()
  actualTotal: number;

  @ApiProperty()
  variance: number;
}

export class TenantDashboardAdminOverviewResponse {
  @ApiPropertyOptional({ type: TenantDashboardOrgKpiSnapshotResponse })
  orgKpi?: TenantDashboardOrgKpiSnapshotResponse;

  @ApiPropertyOptional({ type: TenantDashboardInvitationSummaryResponse })
  invitations?: TenantDashboardInvitationSummaryResponse;

  @ApiPropertyOptional({ type: TenantDashboardDocumentHealthResponse })
  documents?: TenantDashboardDocumentHealthResponse;

  @ApiPropertyOptional({ type: TenantDashboardApprovalQueueResponse })
  approvals?: TenantDashboardApprovalQueueResponse;

  @ApiPropertyOptional({ type: TenantDashboardProjectPortfolioResponse })
  projects?: TenantDashboardProjectPortfolioResponse;

  @ApiPropertyOptional({ type: [TenantDashboardProjectBudgetSummaryResponse] })
  budgets?: TenantDashboardProjectBudgetSummaryResponse[];
}

export class TenantDashboardAssignedWorkSummaryResponse {
  @ApiProperty()
  assignedTasks: number;

  @ApiProperty()
  overdueTasks: number;

  @ApiProperty()
  dueSoonTasks: number;

  @ApiProperty()
  activeProjects: number;
}

export class TenantDashboardMyTicketsSummaryResponse {
  @ApiProperty()
  myOpen: number;

  @ApiProperty()
  pendingApproval: number;

  @ApiProperty()
  changesRequested: number;

  @ApiProperty()
  pendingSubmission: number;
}

export class TenantDashboardMyKpiSummaryResponse {
  @ApiProperty()
  activeTargets: number;

  @ApiPropertyOptional({ enum: KpiTargetPeriod })
  currentPeriod?: KpiTargetPeriod;

  @ApiPropertyOptional()
  currentPeriodStart?: string;

  @ApiPropertyOptional()
  currentPeriodEnd?: string;

  @ApiProperty()
  metricsTracked: number;
}

export class TenantDashboardMyProjectsSummaryResponse {
  @ApiProperty()
  total: number;

  @ApiProperty()
  active: number;

  @ApiProperty()
  completed: number;
}

export class TenantDashboardMemberOverviewResponse {
  @ApiProperty({ type: TenantDashboardAssignedWorkSummaryResponse })
  assignedWork: TenantDashboardAssignedWorkSummaryResponse;

  @ApiProperty({ type: TenantDashboardMyTicketsSummaryResponse })
  tickets: TenantDashboardMyTicketsSummaryResponse;

  @ApiPropertyOptional({ type: TenantDashboardMyKpiSummaryResponse })
  myKpi?: TenantDashboardMyKpiSummaryResponse;

  @ApiProperty({ type: TenantDashboardMyProjectsSummaryResponse })
  projects: TenantDashboardMyProjectsSummaryResponse;
}

export class TenantDashboardPriorityActionResponse {
  @ApiProperty()
  code: string;

  @ApiProperty({ enum: ['neutral', 'primary', 'success', 'warning', 'danger'] })
  tone: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

  @ApiProperty()
  count: number;

  @ApiProperty()
  href: string;
}

export class TenantDashboardNotificationItemResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  read: boolean;

  @ApiProperty()
  href: string;
}

export class TenantDashboardProjectFocusItemResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ enum: ProjectStatus })
  status: ProjectStatus;

  @ApiProperty()
  progress: number;

  @ApiProperty()
  href: string;
}

export class TenantDashboardTicketFocusItemResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: TicketRequestStatus })
  status: TicketRequestStatus;

  @ApiProperty({ enum: TicketRequestType })
  type: TicketRequestType;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty()
  href: string;
}

export class TenantDashboardTaskFocusItemResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  projectSlug: string;

  @ApiPropertyOptional()
  dueDate?: string;

  @ApiProperty({ enum: TaskDueState })
  dueState: TaskDueState;

  @ApiProperty()
  priority: string;

  @ApiProperty()
  href: string;
}

export class TenantDashboardQuickLinkResponse {
  @ApiProperty()
  key: string;

  @ApiProperty()
  href: string;
}

export class TenantDashboardListsResponse {
  @ApiProperty({ type: [TenantDashboardPriorityActionResponse] })
  priorityActions: TenantDashboardPriorityActionResponse[];

  @ApiProperty({ type: [TenantDashboardNotificationItemResponse] })
  recentNotifications: TenantDashboardNotificationItemResponse[];

  @ApiProperty({ type: [TenantDashboardProjectFocusItemResponse] })
  projectFocus: TenantDashboardProjectFocusItemResponse[];

  @ApiProperty({ type: [TenantDashboardTicketFocusItemResponse] })
  ticketFocus: TenantDashboardTicketFocusItemResponse[];

  @ApiProperty({ type: [TenantDashboardTaskFocusItemResponse] })
  taskFocus: TenantDashboardTaskFocusItemResponse[];
}

export class TenantDashboardResponse {
  @ApiProperty({ type: TenantDashboardViewerResponse })
  viewer: TenantDashboardViewerResponse;

  @ApiProperty({ type: TenantDashboardHeroResponse })
  hero: TenantDashboardHeroResponse;

  @ApiPropertyOptional({ type: TenantDashboardAdminOverviewResponse })
  adminOverview?: TenantDashboardAdminOverviewResponse;

  @ApiPropertyOptional({ type: TenantDashboardMemberOverviewResponse })
  memberOverview?: TenantDashboardMemberOverviewResponse;

  @ApiProperty({ type: TenantDashboardListsResponse })
  lists: TenantDashboardListsResponse;

  @ApiProperty({ type: [TenantDashboardQuickLinkResponse] })
  quickLinks: TenantDashboardQuickLinkResponse[];
}
