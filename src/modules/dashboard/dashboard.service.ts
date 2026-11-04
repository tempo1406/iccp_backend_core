import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { KpiTargetService } from '@modules/analytics/kpi-target/kpi-target.service';
import { KpiTargetResponse } from '@modules/analytics/kpi-target/dto/response/kpi-target.response';
import { KpiTargetPeriod } from '@modules/analytics/kpi-target/enums/kpi-target.enum';
import { MessageManagementService } from '@modules/chat-box/message-management/message-management.service';
import { UnreadSummaryResponse } from '@modules/chat-box/message-management/dto/response/unread-summary.response';
import {
  Document,
  DocumentStatus,
} from '@modules/document/core/entities/document.entity';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { GetNotificationsQueryDto } from '@modules/notification/core/dto/request/get-notifications-query.dto';
import { NotificationsListResponse } from '@modules/notification/core/dto/response/notifications-list.response';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import {
  InvitationStatus,
  OrganizationInvitation,
} from '@modules/organization/core/entities/organization-invitation.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import {
  Project,
  ProjectBudgetCurrency,
  ProjectStatus,
} from '@modules/project/core/entities/project.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { TaskDueState } from '@modules/project/task-management/dto/response/task.response';
import { Task } from '@modules/project/task-management/entities/task.entity';
import {
  isTaskCompletedOnTime,
  isTaskDuePassed,
  resolveTaskDueCutoff,
} from '@modules/project/task-management/utils/task-due-date.helper';
import { StatusTask } from '@modules/project/status-task/entities/status-task.entity';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import {
  TicketRequest,
  TicketRequestStatus,
  TicketRequestType,
} from '@modules/ticket-request/core/entities/ticket-request.entity';
import { User } from '@modules/users/entities/user.entity';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import {
  TenantDashboardAdminOverviewResponse,
  TenantDashboardApprovalQueueResponse,
  TenantDashboardAssignedWorkSummaryResponse,
  TenantDashboardDocumentHealthResponse,
  TenantDashboardHeroResponse,
  TenantDashboardInvitationSummaryResponse,
  TenantDashboardMemberOverviewResponse,
  TenantDashboardMyKpiSummaryResponse,
  TenantDashboardMyProjectsSummaryResponse,
  TenantDashboardMyTicketsSummaryResponse,
  TenantDashboardNotificationItemResponse,
  TenantDashboardOrgKpiSnapshotResponse,
  TenantDashboardPriorityActionResponse,
  TenantDashboardProjectFocusItemResponse,
  TenantDashboardProjectBudgetSummaryResponse,
  TenantDashboardProjectPortfolioResponse,
  TenantDashboardQuickLinkResponse,
  TenantDashboardResponse,
  TenantDashboardTaskFocusItemResponse,
  TenantDashboardTicketFocusItemResponse,
  TenantDashboardViewerResponse,
} from './dto/response/tenant-dashboard.response';
import {
  DashboardMemberRange,
  GetDashboardOverviewQueryDto,
} from './dto/request/get-dashboard-overview.query';

const DASHBOARD_LIST_LIMIT = 5;
const TASK_DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;
const ORG_ADMIN_ROLE_NAMES = new Set([
  'org_admin',
  'organization_admin',
  'organization admin',
]);

type RoleVariant = 'org_admin' | 'member';

interface ViewerContext {
  member: OrganizationMember;
  organization: Organization;
  user: User;
  displayName: string;
  roleVariant: RoleVariant;
  permissionCodes: Set<string>;
}

interface ProjectSnapshot {
  total: number;
  active: number;
  completed: number;
  onHold: number;
}

interface DashboardTaskRecord {
  id: string;
  title: string;
  priority: string;
  dueDate?: Date | null;
  completedAt?: Date | null;
  statusName?: string | null;
  projectName: string;
  projectSlug: string;
}

interface DashboardDateRange {
  startAt: Date;
  endAt: Date;
}

interface DashboardPeriodContext {
  roleVariant: RoleVariant;
  dateRange: DashboardDateRange;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(OrganizationInvitation)
    private readonly invitationRepo: Repository<OrganizationInvitation>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepo: Repository<OrganizationMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(StatusTask)
    private readonly statusTaskRepo: Repository<StatusTask>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TicketRequest)
    private readonly ticketRequestRepo: Repository<TicketRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    private readonly kpiTargetService: KpiTargetService,
    private readonly messageManagementService: MessageManagementService,
    private readonly notificationCoreService: NotificationCoreService,
  ) {}

  async getOverview(
    orgId: string,
    userId: string,
    query: GetDashboardOverviewQueryDto,
  ): Promise<TenantDashboardResponse> {
    const viewer = await this.loadViewerContext(orgId, userId);
    const period = this.resolvePeriodContext(viewer.roleVariant, query);

    const notificationsQuery: GetNotificationsQueryDto = { page: 1, limit: DASHBOARD_LIST_LIMIT };
    const [notifications, unreadSummary] = await Promise.all([
      this.notificationCoreService.findByUser(userId, notificationsQuery, orgId),
      this.loadUnreadSummary(orgId, userId, viewer.permissionCodes),
    ]);

    if (viewer.roleVariant === 'org_admin') {
      return this.buildAdminDashboard(viewer, notifications, unreadSummary, period);
    }

    return this.buildMemberDashboard(viewer, notifications, unreadSummary, period);
  }

  private async buildAdminDashboard(
    viewer: ViewerContext,
    notifications: NotificationsListResponse,
    unreadSummary: UnreadSummaryResponse | null,
    period: DashboardPeriodContext,
  ): Promise<TenantDashboardResponse> {
    const canViewOrgKpi = viewer.permissionCodes.has(PERMISSIONS.ANALYTICS.KPI.VIEW_ORG);
    const canListInvitations = viewer.permissionCodes.has(PERMISSIONS.TENANT.INVITATIONS.LIST);
    const canListDocuments =
      viewer.permissionCodes.has(PERMISSIONS.DOCUMENTS.DOCUMENTS.LIST) ||
      viewer.permissionCodes.has(PERMISSIONS.DOCUMENTS.FOLDERS.LIST);
    const canListTickets = viewer.permissionCodes.has(PERMISSIONS.TICKET_REQUESTS.LIST_ORG);

    const [
      orgKpi,
      invitationSummary,
      documentHealth,
      projectPortfolio,
      budgetSummary,
      pendingTicketsCount,
      ticketFocus,
      projectFocus,
      taskFocus,
    ] = await Promise.all([
      canViewOrgKpi ? this.getAdminOrgKpiSnapshot(viewer.organization.id, period.dateRange) : Promise.resolve(null),
      canListInvitations ? this.getInvitationSummary(viewer.organization.id, period.dateRange) : Promise.resolve(null),
      canListDocuments ? this.getDocumentHealth(viewer.organization.id, period.dateRange) : Promise.resolve(null),
      this.getProjectPortfolio(viewer.organization.id, period.dateRange),
      this.getProjectBudgetSummary(viewer.organization.id, period.dateRange),
      canListTickets
        ? this.getManageTicketCount(
            viewer.organization.id,
            TicketRequestStatus.PENDING_APPROVAL,
            period.dateRange,
          )
        : Promise.resolve(0),
      canListTickets ? this.getManageTicketFocus(viewer.organization.id, period.dateRange) : Promise.resolve([]),
      this.getProjectFocus(viewer.organization.id, null, true, period.dateRange),
      this.getTaskFocus(viewer.organization.id, null, true, period.dateRange),
    ]);

    const processingDocuments = documentHealth?.processing ?? 0;
    const failedDocuments = documentHealth?.failed ?? 0;
    const invitationNeedsAttention = invitationSummary?.needsAttention ?? 0;

    const priorityActions = this.buildAdminPriorityActions(
      pendingTicketsCount,
      processingDocuments,
      failedDocuments,
      invitationNeedsAttention,
    );

    const hero = this.buildHero(viewer, notifications.unreadCount, unreadSummary, priorityActions);

    const adminOverview: TenantDashboardAdminOverviewResponse = {};

    if (orgKpi) {
      adminOverview.orgKpi = {
        totalMembers: orgKpi.totalMembers,
        activeMembers: orgKpi.activeMembers,
        activeProjects: orgKpi.activeProjects,
        completionRate: orgKpi.completionRate,
        pendingTickets: orgKpi.pendingTickets,
        totalOtHours: orgKpi.totalOtHours,
      };
    }

    if (invitationSummary) {
      adminOverview.invitations = invitationSummary;
    }

    if (documentHealth) {
      adminOverview.documents = documentHealth;
      adminOverview.approvals = {
        pendingTickets: pendingTicketsCount,
        processingDocuments,
        failedDocuments,
      };
    } else if (canListTickets) {
      adminOverview.approvals = {
        pendingTickets: pendingTicketsCount,
        processingDocuments: 0,
        failedDocuments: 0,
      };
    }

    adminOverview.projects = projectPortfolio;

    if (budgetSummary.length > 0) {
      adminOverview.budgets = budgetSummary;
    }

    return {
      viewer: this.toViewerResponse(viewer),
      hero,
      adminOverview,
      lists: {
        priorityActions,
        recentNotifications: this.mapNotifications(notifications),
        projectFocus,
        ticketFocus,
        taskFocus,
      },
      quickLinks: this.buildQuickLinks(viewer),
    };
  }

  private async buildMemberDashboard(
    viewer: ViewerContext,
    notifications: NotificationsListResponse,
    unreadSummary: UnreadSummaryResponse | null,
    period: DashboardPeriodContext,
  ): Promise<TenantDashboardResponse> {
    const canListOwnTickets = viewer.permissionCodes.has(PERMISSIONS.TICKET_REQUESTS.LIST_OWN);
    const canViewMyKpi =
      viewer.permissionCodes.has(PERMISSIONS.ANALYTICS.KPI.TARGET_VIEW) ||
      viewer.permissionCodes.has(PERMISSIONS.ANALYTICS.KPI.VIEW_PROJECT) ||
      viewer.permissionCodes.has(PERMISSIONS.ANALYTICS.KPI.VIEW_ORG);

    const [assignedWork, myProjectsSummary, taskFocus, projectFocus, myKpi, ticketSummary, ticketFocus] =
      await Promise.all([
        this.getAssignedWorkSummary(viewer.organization.id, viewer.user.id, period.dateRange),
        this.getMemberProjectSummary(viewer.organization.id, viewer.user.id, period.dateRange),
        this.getTaskFocus(viewer.organization.id, viewer.user.id, false, period.dateRange),
        this.getProjectFocus(viewer.organization.id, viewer.user.id, false, period.dateRange),
        canViewMyKpi ? this.getMyKpiSummary(viewer.organization.id, viewer.user.id) : Promise.resolve(null),
        canListOwnTickets
          ? this.getMyTicketSummary(viewer.organization.id, viewer.user.id, period.dateRange)
          : Promise.resolve(this.createEmptyMyTicketSummary()),
        canListOwnTickets
          ? this.getMyTicketFocus(viewer.organization.id, viewer.user.id, period.dateRange)
          : Promise.resolve([]),
      ]);

    const priorityActions = this.buildMemberPriorityActions(
      assignedWork.overdueTasks,
      assignedWork.dueSoonTasks,
      ticketSummary.changesRequested,
      ticketSummary.pendingSubmission,
    );

    const hero = this.buildHero(viewer, notifications.unreadCount, unreadSummary, priorityActions);

    const memberOverview: TenantDashboardMemberOverviewResponse = {
      assignedWork,
      tickets: ticketSummary,
      projects: myProjectsSummary,
    };

    if (myKpi) {
      memberOverview.myKpi = myKpi;
    }

    return {
      viewer: this.toViewerResponse(viewer),
      hero,
      memberOverview,
      lists: {
        priorityActions,
        recentNotifications: this.mapNotifications(notifications),
        projectFocus,
        ticketFocus,
        taskFocus,
      },
      quickLinks: this.buildQuickLinks(viewer),
    };
  }

  private async loadViewerContext(orgId: string, userId: string): Promise<ViewerContext> {
    const [organization, member, user] = await Promise.all([
      this.organizationRepo.findOne({ where: { id: orgId } }),
      this.organizationMemberRepo.findOne({
        where: {
          organizationId: orgId,
          userId,
          isDeleted: false,
        },
      }),
      this.userRepo.findOne({ where: { id: userId } }),
    ]);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (!member || !member.isActive) {
      throw new ForbiddenException('You are not allowed to access this dashboard');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleRows = await this.userRoleRepo
      .createQueryBuilder('userRole')
      .innerJoin(Role, 'role', 'role.id = userRole.role_id AND role.deleted_at IS NULL')
      .leftJoin(
        RolePermission,
        'rolePermission',
        'rolePermission.role_id = role.id',
      )
      .leftJoin(
        Permission,
        'permission',
        'permission.id = rolePermission.permission_id',
      )
      .select('role.name', 'roleName')
      .addSelect('permission.code', 'permissionCode')
      .where('userRole.user_id = :userId', { userId })
      .andWhere('(userRole.organization_id = :orgId OR userRole.organization_id IS NULL)', {
        orgId,
      })
      .getRawMany<{ roleName: string | null; permissionCode: string | null }>();

    const roleNames = new Set(
      roleRows
        .map((row) => row.roleName?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value)),
    );
    const permissionCodes = new Set(
      roleRows
        .map((row) => row.permissionCode?.trim())
        .filter((value): value is string => Boolean(value)),
    );

    const roleVariant: RoleVariant = Array.from(roleNames).some((name) =>
      ORG_ADMIN_ROLE_NAMES.has(name),
    )
      ? 'org_admin'
      : 'member';

    return {
      member,
      organization,
      user,
      displayName: this.buildDisplayName(user),
      roleVariant,
      permissionCodes,
    };
  }

  private resolvePeriodContext(
    roleVariant: RoleVariant,
    query: GetDashboardOverviewQueryDto,
  ): DashboardPeriodContext {
    const now = new Date();

    if (roleVariant === 'org_admin') {
      const year = query.adminYear ?? now.getFullYear();
      const quarter = query.adminQuarter ?? Math.floor(now.getMonth() / 3) + 1;
      return {
        roleVariant,
        dateRange: this.getQuarterRange(year, quarter),
      };
    }

    const memberRange = query.memberRange ?? DashboardMemberRange.LAST_WEEK;

    return {
      roleVariant,
      dateRange:
        memberRange === DashboardMemberRange.TODAY
          ? this.getTodayRange(now)
          : memberRange === DashboardMemberRange.LAST_MONTH
            ? this.getRollingDaysRange(now, 30)
            : this.getRollingDaysRange(now, 7),
    };
  }

  private getQuarterRange(year: number, quarter: number): DashboardDateRange {
    const startMonth = (quarter - 1) * 3;

    return {
      startAt: new Date(year, startMonth, 1, 0, 0, 0, 0),
      endAt: new Date(year, startMonth + 3, 0, 23, 59, 59, 999),
    };
  }

  private getTodayRange(now: Date): DashboardDateRange {
    return {
      startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
      endAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
    };
  }

  private getRollingDaysRange(now: Date, totalDays: number): DashboardDateRange {
    const endAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    startAt.setDate(startAt.getDate() - Math.max(totalDays - 1, 0));

    return { startAt, endAt };
  }

  private applyDateRange<T extends SelectQueryBuilder<any>>(
    qb: T,
    column: string,
    dateRange?: DashboardDateRange,
  ): T {
    if (!dateRange) {
      return qb;
    }

    return qb.andWhere(`${column} BETWEEN :dashboardRangeStart AND :dashboardRangeEnd`, {
      dashboardRangeStart: dateRange.startAt,
      dashboardRangeEnd: dateRange.endAt,
    });
  }

  private buildHero(
    viewer: ViewerContext,
    unreadNotifications: number,
    unreadSummary: UnreadSummaryResponse | null,
    priorityActions: TenantDashboardPriorityActionResponse[],
  ): TenantDashboardHeroResponse {
    return {
      greetingName: viewer.displayName,
      organizationName: viewer.organization.name,
      unreadNotifications,
      unreadChat: unreadSummary?.totalUnread ?? 0,
      pendingActions: priorityActions.reduce((total, item) => total + item.count, 0),
    };
  }

  private toViewerResponse(viewer: ViewerContext): TenantDashboardViewerResponse {
    return {
      userId: viewer.user.id,
      displayName: viewer.displayName,
      organizationId: viewer.organization.id,
      roleVariant: viewer.roleVariant,
    };
  }

  private buildDisplayName(user: User): string {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.email || user.id;
  }

  private async loadUnreadSummary(
    orgId: string,
    userId: string,
    permissionCodes: Set<string>,
  ): Promise<UnreadSummaryResponse | null> {
    if (!permissionCodes.has(PERMISSIONS.CHAT.MESSAGES.LIST)) {
      return null;
    }

    return this.messageManagementService.listMyUnreadCounts(orgId, userId);
  }

  private async getInvitationSummary(
    orgId: string,
    dateRange?: DashboardDateRange,
  ): Promise<TenantDashboardInvitationSummaryResponse> {
    const query = this.invitationRepo
      .createQueryBuilder('invitation')
      .select('invitation.status', 'status')
      .addSelect('COUNT(invitation.id)', 'count')
      .where('invitation.organization_id = :orgId', { orgId })
      .groupBy('invitation.status');

    this.applyDateRange(query, 'invitation.created_at', dateRange);

    const rows = await query.getRawMany<{ status: InvitationStatus; count: string }>();

    const countByStatus = new Map(
      rows.map((row) => [row.status, Number(row.count)]),
    );
    const total = Array.from(countByStatus.values()).reduce((sum, count) => sum + count, 0);
    const accepted = countByStatus.get(InvitationStatus.ACCEPTED) ?? 0;

    return {
      pending: countByStatus.get(InvitationStatus.PENDING) ?? 0,
      needsAttention:
        (countByStatus.get(InvitationStatus.EXPIRED) ?? 0) +
        (countByStatus.get(InvitationStatus.CANCELLED) ?? 0),
      acceptanceRate:
        total > 0 ? Math.round((accepted / total) * 1000) / 10 : 0,
    };
  }

  private async getDocumentHealth(
    orgId: string,
    dateRange?: DashboardDateRange,
  ): Promise<TenantDashboardDocumentHealthResponse> {
    const query = this.documentRepo
      .createQueryBuilder('document')
      .select('document.status', 'status')
      .addSelect('COUNT(document.id)', 'count')
      .where('document.organization_id = :orgId', { orgId })
      .andWhere('document.is_active = true')
      .groupBy('document.status');

    this.applyDateRange(query, 'document.updated_at', dateRange);

    const rows = await query.getRawMany<{ status: string; count: string }>();

    const countByStatus = new Map(rows.map((row) => [row.status, Number(row.count)]));

    return {
      total: Array.from(countByStatus.values()).reduce((sum, count) => sum + count, 0),
      indexed: countByStatus.get(DocumentStatus.INDEXED) ?? 0,
      processing:
        (countByStatus.get(DocumentStatus.PENDING) ?? 0) +
        (countByStatus.get(DocumentStatus.PROCESSING) ?? 0),
      failed: countByStatus.get(DocumentStatus.FAILED) ?? 0,
    };
  }

  private async getProjectPortfolio(
    orgId: string,
    dateRange?: DashboardDateRange,
  ): Promise<TenantDashboardProjectPortfolioResponse> {
    const query = this.projectRepo
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(project.id)', 'count')
      .where('project.organization_id = :orgId', { orgId })
      .andWhere('project.deleted_at IS NULL')
      .groupBy('project.status');

    this.applyDateRange(query, 'project.updated_at', dateRange);

    const rows = await query.getRawMany<{ status: ProjectStatus; count: string }>();

    const countByStatus = new Map(rows.map((row) => [row.status, Number(row.count)]));

    return {
      total: Array.from(countByStatus.values()).reduce((sum, count) => sum + count, 0),
      active: countByStatus.get(ProjectStatus.ACTIVE) ?? 0,
      completed: countByStatus.get(ProjectStatus.COMPLETED) ?? 0,
      onHold: countByStatus.get(ProjectStatus.ON_HOLD) ?? 0,
    };
  }

  private async getAdminOrgKpiSnapshot(
    orgId: string,
    dateRange: DashboardDateRange,
  ): Promise<TenantDashboardOrgKpiSnapshotResponse> {
    const [memberCount, projectSnapshot, pendingTickets, taskStats, approvedOtTickets] = await Promise.all([
      this.organizationMemberRepo.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          isActive: true,
        },
      }),
      this.getProjectPortfolio(orgId, dateRange),
      this.getManageTicketCount(orgId, TicketRequestStatus.PENDING_APPROVAL, dateRange),
      this.buildTaskCompletionSnapshot(orgId, dateRange),
      this.ticketRequestRepo
        .createQueryBuilder('ticket')
        .where('ticket.organization_id = :orgId', { orgId })
        .andWhere('ticket.deleted_at IS NULL')
        .andWhere('ticket.type = :type', { type: TicketRequestType.OVERTIME })
        .andWhere('ticket.status = :status', { status: TicketRequestStatus.APPROVED }),
    ]);

    this.applyDateRange(approvedOtTickets, 'ticket.updated_at', dateRange);

    const overtimeRows = await approvedOtTickets.getMany();
    const totalOtHours = overtimeRows.reduce((sum, ticket) => {
      const entries = ((ticket.otMetadata as { effortEntries?: Array<{ hours?: unknown }> } | undefined)
        ?.effortEntries ?? []) as Array<{ hours?: unknown }>;

      return (
        sum +
        entries.reduce((entrySum, entry) => entrySum + Number(entry.hours ?? 0), 0)
      );
    }, 0);

    return {
      totalMembers: memberCount,
      activeMembers: memberCount,
      activeProjects: projectSnapshot.active,
      completionRate: taskStats.completionRate,
      pendingTickets,
      totalOtHours: Math.round(totalOtHours * 100) / 100,
    };
  }

  private async buildTaskCompletionSnapshot(
    orgId: string,
    dateRange: DashboardDateRange,
  ): Promise<{ completionRate: number }> {
    const query = this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        StatusTask,
        'status',
        'status.id = task.status_id AND status.project_id = task.project_id AND status.deleted_at IS NULL',
      )
      .select('COUNT(task.id)', 'totalTasks')
      .addSelect(
        `SUM(CASE WHEN LOWER(COALESCE(status.name, '')) = 'done' THEN 1 ELSE 0 END)`,
        'completedTasks',
      )
      .where('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL');

    this.applyDateRange(query, 'task.updated_at', dateRange);

    const snapshot = await query.getRawOne<{ totalTasks: string; completedTasks: string }>();
    const totalTasks = Number(snapshot?.totalTasks ?? 0);
    const completedTasks = Number(snapshot?.completedTasks ?? 0);

    return {
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }

  private async getManageTicketCount(
    orgId: string,
    status?: TicketRequestStatus,
    dateRange?: DashboardDateRange,
  ): Promise<number> {
    const query = this.ticketRequestRepo
      .createQueryBuilder('ticket')
      .where('ticket.organization_id = :orgId', { orgId })
      .andWhere('ticket.deleted_at IS NULL');

    if (status) {
      query.andWhere('ticket.status = :status', { status });
    }

    this.applyDateRange(query, 'ticket.updated_at', dateRange);

    return query.getCount();
  }

  private async getManageTicketFocus(
    orgId: string,
    dateRange?: DashboardDateRange,
  ): Promise<TenantDashboardTicketFocusItemResponse[]> {
    const query = this.ticketRequestRepo
      .createQueryBuilder('ticket')
      .where('ticket.organization_id = :orgId', { orgId })
      .andWhere('ticket.deleted_at IS NULL')
      .orderBy('ticket.updated_at', 'DESC')
      .take(DASHBOARD_LIST_LIMIT);

    this.applyDateRange(query, 'ticket.updated_at', dateRange);

    return this.mapTicketFocus(await query.getMany());
  }

  private async getMyTicketSummary(
    orgId: string,
    userId: string,
    dateRange?: DashboardDateRange,
  ): Promise<TenantDashboardMyTicketsSummaryResponse> {
    const [openCount, pendingApprovalCount, changesRequestedCount, pendingSubmissionCount] =
      await Promise.all([
        this.getMyTicketCount(orgId, userId, undefined, dateRange),
        this.getMyTicketCount(orgId, userId, TicketRequestStatus.PENDING_APPROVAL, dateRange),
        this.getMyTicketCount(orgId, userId, TicketRequestStatus.CHANGES_REQUESTED, dateRange),
        this.getMyTicketCount(orgId, userId, TicketRequestStatus.PENDING_SUBMISSION, dateRange),
      ]);

    return {
      myOpen:
        openCount - pendingApprovalCount - changesRequestedCount - pendingSubmissionCount,
      pendingApproval: pendingApprovalCount,
      changesRequested: changesRequestedCount,
      pendingSubmission: pendingSubmissionCount,
    };
  }

  private createEmptyMyTicketSummary(): TenantDashboardMyTicketsSummaryResponse {
    return {
      myOpen: 0,
      pendingApproval: 0,
      changesRequested: 0,
      pendingSubmission: 0,
    };
  }

  private async getMyTicketCount(
    orgId: string,
    userId: string,
    status?: TicketRequestStatus,
    dateRange?: DashboardDateRange,
  ): Promise<number> {
    const query = this.ticketRequestRepo
      .createQueryBuilder('ticket')
      .where('ticket.organization_id = :orgId', { orgId })
      .andWhere('ticket.requester_id = :userId', { userId })
      .andWhere('ticket.deleted_at IS NULL');

    if (status) {
      query.andWhere('ticket.status = :status', { status });
    }

    this.applyDateRange(query, 'ticket.updated_at', dateRange);

    return query.getCount();
  }

  private async getMyTicketFocus(
    orgId: string,
    userId: string,
    dateRange?: DashboardDateRange,
  ): Promise<TenantDashboardTicketFocusItemResponse[]> {
    const query = this.ticketRequestRepo
      .createQueryBuilder('ticket')
      .where('ticket.organization_id = :orgId', { orgId })
      .andWhere('ticket.requester_id = :userId', { userId })
      .andWhere('ticket.deleted_at IS NULL')
      .orderBy('ticket.updated_at', 'DESC')
      .take(DASHBOARD_LIST_LIMIT);

    this.applyDateRange(query, 'ticket.updated_at', dateRange);

    return this.mapTicketFocus(await query.getMany());
  }

  private mapTicketFocus(
    items: TicketRequest[],
  ): TenantDashboardTicketFocusItemResponse[] {
    return items.map((ticket) => ({
      id: ticket.id,
      code: ticket.code,
      title: ticket.title,
      status: ticket.status,
      type: ticket.type,
      updatedAt: ticket.updatedAt.toISOString(),
      href: `/ticket/${ticket.id}`,
    }));
  }

  private async getMemberProjectSummary(
    orgId: string,
    userId: string,
    dateRange?: DashboardDateRange,
  ): Promise<TenantDashboardMyProjectsSummaryResponse> {
    const snapshot = await this.getProjectSnapshot(orgId, userId, dateRange);
    return {
      total: snapshot.total,
      active: snapshot.active,
      completed: snapshot.completed,
    };
  }

  private async getProjectSnapshot(
    orgId: string,
    userId: string | null,
    dateRange?: DashboardDateRange,
  ): Promise<ProjectSnapshot> {
    const rows = await this.buildAccessibleProjectsQuery(orgId, userId, dateRange)
      .select('project.status', 'status')
      .addSelect('COUNT(project.id)', 'count')
      .groupBy('project.status')
      .getRawMany<{ status: ProjectStatus; count: string }>();

    const countByStatus = new Map(rows.map((row) => [row.status, Number(row.count)]));

    return {
      total: Array.from(countByStatus.values()).reduce((sum, count) => sum + count, 0),
      active: countByStatus.get(ProjectStatus.ACTIVE) ?? 0,
      completed: countByStatus.get(ProjectStatus.COMPLETED) ?? 0,
      onHold: countByStatus.get(ProjectStatus.ON_HOLD) ?? 0,
    };
  }

  private async getProjectBudgetSummary(
    orgId: string,
    dateRange?: DashboardDateRange,
  ): Promise<TenantDashboardProjectBudgetSummaryResponse[]> {
    const rows = await this.buildAccessibleProjectsQuery(orgId, null, dateRange)
      .select('project.budget_currency', 'currency')
      .addSelect('COALESCE(SUM(project.estimated_budget), 0)', 'estimatedTotal')
      .addSelect('COALESCE(SUM(project.actual_budget), 0)', 'actualTotal')
      .groupBy('project.budget_currency')
      .getRawMany<{
        currency: ProjectBudgetCurrency;
        estimatedTotal: string;
        actualTotal: string;
      }>();

    return rows
      .map((row) => {
        const estimatedTotal = Number(row.estimatedTotal ?? 0);
        const actualTotal = Number(row.actualTotal ?? 0);

        return {
          currency: row.currency,
          estimatedTotal,
          actualTotal,
          variance: actualTotal - estimatedTotal,
        };
      })
      .filter((row) => row.estimatedTotal > 0 || row.actualTotal > 0);
  }

  private async getProjectFocus(
    orgId: string,
    userId: string | null,
    includeAllOrganizationProjects: boolean,
    dateRange?: DashboardDateRange,
  ): Promise<TenantDashboardProjectFocusItemResponse[]> {
    const rows = await this.buildAccessibleProjectsQuery(
      orgId,
      includeAllOrganizationProjects ? null : userId,
      dateRange,
    )
      .orderBy(
        `CASE
          WHEN project.status = '${ProjectStatus.ACTIVE}' THEN 0
          WHEN project.status = '${ProjectStatus.ON_HOLD}' THEN 1
          WHEN project.status = '${ProjectStatus.PLANNING}' THEN 2
          WHEN project.status = '${ProjectStatus.COMPLETED}' THEN 3
          ELSE 4
        END`,
      )
      .addOrderBy('project.updated_at', 'DESC')
      .take(DASHBOARD_LIST_LIMIT)
      .getMany();

    return rows.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      status: project.status,
      progress: Number(project.progress ?? 0),
      href: `/projects/${project.slug}`,
    }));
  }

  private buildAccessibleProjectsQuery(
    orgId: string,
    userId: string | null,
    dateRange?: DashboardDateRange,
  ) {
    const qb = this.projectRepo
      .createQueryBuilder('project')
      .where('project.organization_id = :orgId', { orgId })
      .andWhere('project.deleted_at IS NULL');

    this.applyDateRange(qb, 'project.updated_at', dateRange);

    if (!userId) {
      return qb;
    }

    const memberSubQuery = this.projectMemberRepo
      .createQueryBuilder('member')
      .select('1')
      .where('member.project_id = project.id')
      .andWhere('member.organization_id = :orgId')
      .andWhere('member.user_id = :userId')
      .andWhere('member.is_active = true')
      .andWhere('member.deleted_at IS NULL')
      .getQuery();

    qb.andWhere(
      new Brackets((projectQb) => {
        projectQb
          .where('project.created_by = :userId')
          .orWhere('(project.manager_id IS NOT NULL AND :userId = ANY(project.manager_id))')
          .orWhere(`EXISTS (${memberSubQuery})`);
      }),
    );

    qb.setParameters({ orgId, userId });

    return qb;
  }

  private async getAssignedWorkSummary(
    orgId: string,
    userId: string,
    dateRange?: DashboardDateRange,
  ): Promise<TenantDashboardAssignedWorkSummaryResponse> {
    const [taskRows, projectSnapshot] = await Promise.all([
      this.getOpenTasks(orgId, userId, false, 250, dateRange),
      this.getProjectSnapshot(orgId, userId, dateRange),
    ]);

    const dueStateCounts = taskRows.reduce<Record<string, number>>((accumulator, task) => {
      const dueState = this.resolveTaskDueState(task);
      accumulator[dueState] = (accumulator[dueState] ?? 0) + 1;
      return accumulator;
    }, {});

    return {
      assignedTasks: taskRows.length,
      overdueTasks: dueStateCounts[TaskDueState.OVERDUE] ?? 0,
      dueSoonTasks: dueStateCounts[TaskDueState.DUE_SOON] ?? 0,
      activeProjects: projectSnapshot.active,
    };
  }

  private async getMyKpiSummary(
    orgId: string,
    userId: string,
  ): Promise<TenantDashboardMyKpiSummaryResponse | null> {
    const targets = await this.kpiTargetService.listMine(orgId, userId);
    if (targets.length === 0) {
      return null;
    }

    const currentTarget = targets[0];

    return {
      activeTargets: targets.length,
      currentPeriod: currentTarget.period as KpiTargetPeriod,
      currentPeriodStart: currentTarget.periodStart,
      currentPeriodEnd: currentTarget.periodEnd,
      metricsTracked: this.countTrackedMetrics(currentTarget),
    };
  }

  private countTrackedMetrics(target: KpiTargetResponse): number {
    return [
      target.targetScore,
      target.targetPointCompletionRate,
      target.targetOnTimeRate,
      target.targetOtHours,
      target.targetCompletedTasks,
      target.maxOverdueTasks,
      target.requireZeroOverdue ? 1 : null,
    ].filter((value) => value !== null && value !== undefined).length;
  }

  private async getTaskFocus(
    orgId: string,
    userId: string | null,
    includeAllOrganizationTasks: boolean,
    dateRange?: DashboardDateRange,
  ): Promise<TenantDashboardTaskFocusItemResponse[]> {
    const rows = await this.getOpenTasks(
      orgId,
      includeAllOrganizationTasks ? null : userId,
      includeAllOrganizationTasks,
      DASHBOARD_LIST_LIMIT * 4,
      dateRange,
    );

    return rows
      .map((task) => ({
        id: task.id,
        title: task.title,
        projectName: task.projectName,
        projectSlug: task.projectSlug,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
        dueState: this.resolveTaskDueState(task),
        priority: task.priority,
        href: `/projects/${task.projectSlug}/board`,
      }))
      .sort((left, right) => this.compareDueState(left.dueState, right.dueState))
      .slice(0, DASHBOARD_LIST_LIMIT);
  }

  private async getOpenTasks(
    orgId: string,
    userId: string | null,
    includeAllOrganizationTasks: boolean,
    limit: number,
    dateRange?: DashboardDateRange,
  ): Promise<DashboardTaskRecord[]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .innerJoin(Project, 'project', 'project.id = task.project_id')
      .leftJoin(StatusTask, 'status', 'status.id = task.status_id')
      .select('task.id', 'id')
      .addSelect('task.title', 'title')
      .addSelect('task.priority', 'priority')
      .addSelect('task.due_date', 'dueDate')
      .addSelect('task.completed_at', 'completedAt')
      .addSelect('status.name', 'statusName')
      .addSelect('project.name', 'projectName')
      .addSelect('project.slug', 'projectSlug')
      .where('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('project.deleted_at IS NULL')
      .andWhere('task.assigned_to IS NOT NULL');

    this.applyDateRange(qb, 'task.updated_at', dateRange);

    if (!includeAllOrganizationTasks && userId) {
      qb.andWhere('task.assigned_to = :userId', { userId });
    }

    qb.orderBy('task.updated_at', 'DESC').take(limit);

    const rows = await qb.getRawMany<{
      id: string;
      title: string;
      priority: string;
      dueDate?: Date | string | null;
      completedAt?: Date | string | null;
      statusName?: string | null;
      projectName: string;
      projectSlug: string;
    }>();

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      priority: row.priority,
      dueDate: row.dueDate ? new Date(row.dueDate) : null,
      completedAt: row.completedAt ? new Date(row.completedAt) : null,
      statusName: row.statusName ?? null,
      projectName: row.projectName,
      projectSlug: row.projectSlug,
    }));
  }

  private resolveTaskDueState(task: Pick<DashboardTaskRecord, 'completedAt' | 'dueDate' | 'statusName'>): TaskDueState {
    if (!task.dueDate) {
      return TaskDueState.NO_DUE_DATE;
    }

    const isDone =
      typeof task.statusName === 'string' &&
      task.statusName.trim().toLowerCase().replace(/\s+/g, '_') === 'done';

    const dueDate = new Date(task.dueDate);

    if (isDone) {
      if (task.completedAt && !isTaskCompletedOnTime(new Date(task.completedAt), dueDate)) {
        return TaskDueState.DONE_LATE;
      }

      return TaskDueState.DONE_ON_TIME;
    }

    const now = Date.now();

    if (isTaskDuePassed(dueDate, now)) {
      return TaskDueState.OVERDUE;
    }

    if (resolveTaskDueCutoff(dueDate).getTime() <= now + TASK_DUE_SOON_WINDOW_MS) {
      return TaskDueState.DUE_SOON;
    }

    return TaskDueState.ON_TRACK;
  }

  private compareDueState(left: TaskDueState, right: TaskDueState): number {
    const rank = (value: TaskDueState): number => {
      switch (value) {
        case TaskDueState.OVERDUE:
          return 0;
        case TaskDueState.DUE_SOON:
          return 1;
        case TaskDueState.ON_TRACK:
          return 2;
        case TaskDueState.NO_DUE_DATE:
          return 3;
        case TaskDueState.DONE_LATE:
          return 4;
        case TaskDueState.DONE_ON_TIME:
          return 5;
        default:
          return 6;
      }
    };

    return rank(left) - rank(right);
  }

  private mapNotifications(
    notifications: NotificationsListResponse,
  ): TenantDashboardNotificationItemResponse[] {
    return notifications.data.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt,
      read: notification.read,
      href: `/notifications?notificationId=${encodeURIComponent(notification.id)}`,
    }));
  }

  private buildAdminPriorityActions(
    pendingTicketsCount: number,
    processingDocuments: number,
    failedDocuments: number,
    invitationNeedsAttention: number,
  ): TenantDashboardPriorityActionResponse[] {
    const items: TenantDashboardPriorityActionResponse[] = [
      {
        code: 'pendingTickets',
        count: pendingTicketsCount,
        href: '/ticket/list',
        tone: 'warning',
      },
      {
        code: 'processingDocuments',
        count: processingDocuments,
        href: '/documents',
        tone: 'primary',
      },
      {
        code: 'failedDocuments',
        count: failedDocuments,
        href: '/documents/approval',
        tone: 'danger',
      },
      {
        code: 'invitationNeedsAttention',
        count: invitationNeedsAttention,
        href: '/organization-management/invite-members',
        tone: 'warning',
      },
    ];

    return items.filter((item) => item.count > 0);
  }

  private buildMemberPriorityActions(
    overdueTasks: number,
    dueSoonTasks: number,
    changesRequestedTickets: number,
    pendingSubmissionTickets: number,
  ): TenantDashboardPriorityActionResponse[] {
    const items: TenantDashboardPriorityActionResponse[] = [
      {
        code: 'overdueTasks',
        count: overdueTasks,
        href: '/projects',
        tone: 'danger',
      },
      {
        code: 'dueSoonTasks',
        count: dueSoonTasks,
        href: '/projects',
        tone: 'warning',
      },
      {
        code: 'changesRequestedTickets',
        count: changesRequestedTickets,
        href: '/ticket/list',
        tone: 'warning',
      },
      {
        code: 'pendingSubmissionTickets',
        count: pendingSubmissionTickets,
        href: '/ticket/list',
        tone: 'primary',
      },
    ];

    return items.filter((item) => item.count > 0);
  }

  private buildQuickLinks(viewer: ViewerContext): TenantDashboardQuickLinkResponse[] {
    const links: TenantDashboardQuickLinkResponse[] = [];
    const canViewProjects =
      viewer.permissionCodes.has(PERMISSIONS.PROJECTS.PROJECTS.LIST) ||
      viewer.permissionCodes.has(PERMISSIONS.PROJECTS.PROJECTS.VIEW);
    const canViewDocuments =
      viewer.permissionCodes.has(PERMISSIONS.DOCUMENTS.DOCUMENTS.LIST) ||
      viewer.permissionCodes.has(PERMISSIONS.DOCUMENTS.FOLDERS.LIST);
    const canViewTeamChat = viewer.permissionCodes.has(PERMISSIONS.CHAT.MESSAGES.LIST);
    const canViewMyTickets = viewer.permissionCodes.has(PERMISSIONS.TICKET_REQUESTS.LIST_OWN);
    const canViewOrgTickets = viewer.permissionCodes.has(PERMISSIONS.TICKET_REQUESTS.LIST_ORG);
    const canViewAnalytics =
      viewer.permissionCodes.has(PERMISSIONS.ANALYTICS.VIEW_DASHBOARD) ||
      viewer.permissionCodes.has(PERMISSIONS.ANALYTICS.KPI.VIEW_ORG) ||
      viewer.permissionCodes.has(PERMISSIONS.ANALYTICS.KPI.TARGET_VIEW) ||
      viewer.permissionCodes.has(PERMISSIONS.ANALYTICS.REPORTS.VIEW);

    if (viewer.roleVariant === 'org_admin') {
      links.push({ key: 'organizationManagement', href: '/organization-management' });
      if (canViewAnalytics) {
        links.push({ key: 'analytics', href: '/analytics' });
      }
      if (canViewOrgTickets) {
        links.push({ key: 'ticketCenter', href: '/ticket/list' });
      }
      if (canViewDocuments) {
        links.push({ key: 'documents', href: '/documents' });
      }
      if (canViewProjects) {
        links.push({ key: 'projects', href: '/projects' });
      }

      return links;
    }

    if (canViewTeamChat) {
      links.push({ key: 'teamChat', href: '/team-chat' });
    }
    if (canViewMyTickets) {
      links.push({ key: 'ticketCenter', href: '/ticket/list' });
    }
    links.push({ key: 'myKpi', href: '/my-kpi' });
    if (canViewProjects) {
      links.push({ key: 'projects', href: '/projects' });
    }
    if (canViewDocuments) {
      links.push({ key: 'documents', href: '/documents' });
    }

    return links;
  }
}
