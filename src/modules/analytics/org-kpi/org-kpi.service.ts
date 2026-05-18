import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  Project,
  ProjectStatus,
} from '@modules/project/core/entities/project.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Task } from '@modules/project/task-management/entities/task.entity';
import { StatusTask } from '@modules/project/status-task/entities/status-task.entity';
import {
  buildTaskDoneLateSql,
  buildTaskDoneOnTimeSql,
  buildTaskDuePassedSql,
} from '@modules/project/task-management/utils/task-due-date.helper';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import {
  TicketRequest,
  TicketRequestStatus,
  TicketRequestType,
} from '@modules/ticket-request/core/entities/ticket-request.entity';
import { User } from '@modules/users/entities/user.entity';
import { WorkingTimeService } from '@modules/organization/working-time/working-time.service';
import { KpiSettingsResolver } from '@modules/analytics/kpi-settings-resolver.service';
import { KpiActualService } from '@modules/analytics/kpi-actual.service';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import {
  calcBasePerformanceScore,
  calcBonusPoints,
  calcFinalScore,
  calcOtContributionScore,
  calcRates,
} from '@modules/analytics/kpi-formula.helper';
import { OrgKpiMembersQueryRequest } from './dto/request/org-kpi-query.request';
import { OrgKpiOverviewResponse } from './dto/response/org-kpi-overview.response';
import { OrgMemberKpiResponse } from './dto/response/org-member-kpi.response';
import { OrgMemberKpiDetailResponse } from './dto/response/org-member-kpi-detail.response';

const TASK_DUE_SOON_HOURS = 24;

@Injectable()
export class OrgKpiService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,

    @InjectRepository(StatusTask)
    private readonly statusTaskRepo: Repository<StatusTask>,

    @InjectRepository(OrganizationMember)
    private readonly orgMemberRepo: Repository<OrganizationMember>,

    @InjectRepository(TicketRequest)
    private readonly ticketRepo: Repository<TicketRequest>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,

    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,

    private readonly workingTimeService: WorkingTimeService,
    private readonly kpiSettingsResolver: KpiSettingsResolver,
    private readonly kpiActualService: KpiActualService,
  ) {}

  async getOrgOverview(orgId: string): Promise<OrgKpiOverviewResponse> {
    const [projects, memberStats] = await Promise.all([
      this.projectRepo.find({ where: { organizationId: orgId } }),
      this.orgMemberRepo
        .createQueryBuilder('m')
        .select('COUNT(DISTINCT m.user_id)', 'totalMembers')
        .addSelect(
          'COUNT(DISTINCT CASE WHEN m.is_active = true AND m.left_at IS NULL THEN m.user_id END)',
          'activeMembers',
        )
        .where('m.organization_id = :orgId', { orgId })
        .andWhere('m.is_deleted = false')
        .getRawOne<{ totalMembers?: string; activeMembers?: string }>(),
    ]);
    const totalMembers = Number(memberStats?.totalMembers) || 0;
    const activeMembers = Number(memberStats?.activeMembers) || 0;

    const totalProjects = projects.filter((p) => !p.deletedAt).length;
    const activeProjects = projects.filter(
      (p) => p.status === ProjectStatus.ACTIVE && !p.deletedAt,
    ).length;
    const completedProjects = projects.filter(
      (p) => p.status === ProjectStatus.COMPLETED && !p.deletedAt,
    ).length;
    const onHoldProjects = projects.filter(
      (p) => p.status === ProjectStatus.ON_HOLD && !p.deletedAt,
    ).length;
    const cancelledProjects = projects.filter(
      (p) => p.status === ProjectStatus.CANCELLED && !p.deletedAt,
    ).length;
    const avgProjectProgress = totalProjects
      ? Math.round(
          projects.reduce((s, p) => s + (p.progress ?? 0), 0) / totalProjects,
        )
      : 0;

    const now = new Date();

    const taskStats = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        StatusTask,
        'st',
        'st.id = task.status_id AND st.project_id = task.project_id AND st.deleted_at IS NULL',
      )
      .leftJoin(
        Task,
        'child',
        'child.parent_task_id = task.id AND child.organization_id = task.organization_id AND child.deleted_at IS NULL',
      )
      .select([
        'COUNT(task.id) AS "totalTasks"',
        `SUM(CASE WHEN LOWER(st.name) = 'done' THEN 1 ELSE 0 END) AS "completedTasks"`,
        `SUM(CASE WHEN LOWER(st.name) = 'done' THEN COALESCE(task.estimated_point, 1) ELSE 0 END) AS "totalActualPoints"`,
        'SUM(COALESCE(task.estimated_point, 1)) AS "totalEstimatePoints"',
        `SUM(CASE WHEN LOWER(st.name) = 'done' AND task.due_date IS NOT NULL AND task.completed_at IS NOT NULL AND ${buildTaskDoneOnTimeSql()} THEN 1 ELSE 0 END) AS "onTimeTasks"`,
        `SUM(CASE WHEN (st.id IS NULL OR LOWER(st.name) != 'done') AND task.due_date IS NOT NULL AND ${buildTaskDuePassedSql()} THEN 1 ELSE 0 END) AS "overdueTasks"`,
      ])
      .where('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('child.id IS NULL')
      .setParameter('now', now)
      .getRawOne();

    const totalTasks = Number(taskStats?.totalTasks) || 0;
    const completedTasks = Number(taskStats?.completedTasks) || 0;
    const onTimeTasks = Number(taskStats?.onTimeTasks) || 0;
    const overdueTasks = Number(taskStats?.overdueTasks) || 0;
    const totalEstimate = Number(taskStats?.totalEstimatePoints) || 0;
    const totalActual = Number(taskStats?.totalActualPoints) || 0;

    const completionRate = totalTasks
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;
    const onTimeRate = completedTasks
      ? Math.round((onTimeTasks / completedTasks) * 100)
      : 0;
    const pointCompletionRate = totalEstimate
      ? Math.round((totalActual / totalEstimate) * 100)
      : 0;

    // Tickets
    const tickets = await this.ticketRepo.find({
      where: { organizationId: orgId },
    });
    const totalTickets = tickets.length;
    const pendingTickets = tickets.filter(
      (t) =>
        t.status === TicketRequestStatus.PENDING_APPROVAL ||
        t.status === TicketRequestStatus.PENDING_SUBMISSION,
    ).length;
    const approvedTickets = tickets.filter(
      (t) => t.status === TicketRequestStatus.APPROVED,
    ).length;
    const rejectedTickets = tickets.filter(
      (t) => t.status === TicketRequestStatus.REJECTED,
    ).length;

    const approvedOtTickets = tickets.filter(
      (t) =>
        t.type === TicketRequestType.OVERTIME &&
        t.status === TicketRequestStatus.APPROVED,
    );
    const totalOtHours = approvedOtTickets.reduce((sum, t) => {
      const entries = ((t.otMetadata as any)?.effortEntries ?? []) as Array<{
        hours: unknown;
      }>;
      return sum + entries.reduce((s: number, e) => s + Number(e.hours), 0);
    }, 0);

    return {
      organizationId: orgId,
      totalMembers,
      activeMembers,
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      cancelledProjects,
      avgProjectProgress,
      totalTasks,
      completedTasks,
      overdueTasks,
      totalEstimatePoints: totalEstimate,
      totalActualPoints: totalActual,
      completionRate,
      pointCompletionRate,
      onTimeRate,
      totalTickets,
      pendingTickets,
      approvedTickets,
      rejectedTickets,
      totalApprovedOtTickets: approvedOtTickets.length,
      totalOtHours: Math.round(totalOtHours * 100) / 100,
    };
  }

  async getOrgMembersKpi(
    orgId: string,
    currentUserId: string,
    query: OrgKpiMembersQueryRequest,
  ): Promise<{
    data: OrgMemberKpiResponse[];
    meta: { total: number; page: number; limit: number };
  }> {
    const orgMembers = await this.orgMemberRepo.find({
      where: {
        organizationId: orgId,
        isActive: true,
        isDeleted: false,
        leftAt: IsNull(),
      },
    });
    let memberIds = [...new Set(orgMembers.map((m) => m.userId))];

    if (query.userId) {
      if (!memberIds.includes(query.userId))
        throw new NotFoundException('Member not found');
      memberIds = [query.userId];
    }

    if (!memberIds.length)
      return {
        data: [],
        meta: { total: 0, page: query.page ?? 1, limit: query.limit ?? 20 },
      };

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;
    const actualMap = await this.kpiActualService.computeOrgMembersActual(
      orgId,
      memberIds,
      {
        dateFrom,
        dateTo,
        now: new Date(),
      },
    );

    // Count tickets per user
    const userTickets = await this.ticketRepo
      .createQueryBuilder('tr')
      .select([
        'tr.requester_id AS "userId"',
        'tr.status AS status',
        'tr.type AS type',
      ])
      .where('tr.organization_id = :orgId', { orgId })
      .andWhere('tr.requester_id IN (:...memberIds)', { memberIds })
      .getRawMany();

    const ticketMap = new Map<
      string,
      { total: number; pending: number; approved: number; rejected: number }
    >();
    for (const t of userTickets) {
      if (!ticketMap.has(t.userId))
        ticketMap.set(t.userId, {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        });
      const tm = ticketMap.get(t.userId)!;
      tm.total++;
      if (
        t.status === TicketRequestStatus.PENDING_APPROVAL ||
        t.status === TicketRequestStatus.PENDING_SUBMISSION
      )
        tm.pending++;
      if (t.status === TicketRequestStatus.APPROVED) tm.approved++;
      if (t.status === TicketRequestStatus.REJECTED) tm.rejected++;
    }

    const users = await this.userRepo.findByIds(memberIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    const results: OrgMemberKpiResponse[] = [];
    for (const userId of memberIds) {
      const actual = actualMap.get(userId);
      if (!actual) continue;
      const user = userMap.get(userId);
      const tickets = ticketMap.get(userId) ?? {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      results.push({
        userId,
        fullName: user
          ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
          : undefined,
        email: user?.email,
        avatar: user?.avatarUrl,
        projectCount: actual.projectCount,
        activeProjectCount: actual.activeProjectCount,
        totalAssigned: actual.totalAssigned,
        completedTasks: actual.completedTasks,
        openTasks: actual.openTasks,
        onTimeTasks: actual.onTimeTasks,
        lateTasks: actual.lateTasks,
        overdueTasks: actual.overdueTasks,
        dueSoonTasks: actual.dueSoonTasks,
        totalEstimatePoints: actual.totalEstimatePoints,
        totalActualPoints: actual.totalActualPoints,
        openPoints: actual.openPoints,
        pointCompletionRate: actual.pointCompletionRate,
        totalEstimatedHours: actual.totalEstimatedHours,
        expectedWorkingHours: actual.expectedWorkingHours,
        approvedOtTickets: actual.approvedOtTickets,
        totalOtHours: actual.totalOtHours,
        effectiveOtHours: actual.effectiveOtHours,
        completionRate: actual.completionRate,
        onTimeRate: actual.onTimeRate,
        overdueRate: actual.overdueRate,
        performanceScore: actual.performanceScore,
        totalTickets: tickets.total,
        pendingTickets: tickets.pending,
        approvedTickets: tickets.approved,
        rejectedTickets: tickets.rejected,
      });
    }

    const sortBy = query.sortBy ?? 'performanceScore';
    const sortOrder = query.sortOrder ?? 'DESC';
    results.sort((a, b) => {
      const va = (a as any)[sortBy] ?? 0;
      const vb = (b as any)[sortBy] ?? 0;
      return sortOrder === 'DESC' ? vb - va : va - vb;
    });

    const total = results.length;
    const paginated = results.slice((page - 1) * limit, page * limit);
    return { data: paginated, meta: { total, page, limit } };
  }

  async getOrgMemberKpiDetail(
    orgId: string,
    currentUserId: string,
    targetUserId: string,
  ): Promise<OrgMemberKpiDetailResponse> {
    const isOrgAdmin = await this.hasOrgPermission(
      currentUserId,
      orgId,
      PERMISSIONS.ANALYTICS.KPI.VIEW_ORG,
    );
    const isSelf = currentUserId === targetUserId;
    if (!isOrgAdmin && !isSelf)
      throw new ForbiddenException('No permission to view this member KPI');

    const { data } = await this.getOrgMembersKpi(orgId, currentUserId, {
      userId: targetUserId,
    } as OrgKpiMembersQueryRequest);
    if (!data.length) throw new NotFoundException('Member not found');
    const base = data[0];

    const user = await this.userRepo.findOne({ where: { id: targetUserId } });

    // By project breakdown
    const projectMembers = await this.projectMemberRepo.find({
      where: { userId: targetUserId, organizationId: orgId },
    });
    const projectIds = projectMembers.map((pm) => pm.projectId);

    const byProject = await Promise.all(
      projectIds.map(async (projectId) => {
        const project = await this.projectRepo.findOne({
          where: { id: projectId },
        });
        if (!project) return null;

        const now = new Date();

        const pRows = await this.taskRepo
          .createQueryBuilder('task')
          .leftJoin(
            StatusTask,
            'st',
            'st.id = task.status_id AND st.project_id = task.project_id AND st.deleted_at IS NULL',
          )
          .leftJoin(
            Task,
            'child',
            'child.parent_task_id = task.id AND child.organization_id = task.organization_id AND child.deleted_at IS NULL',
          )
          .select([
            'COUNT(task.id) AS "totalAssigned"',
            'SUM(COALESCE(task.estimated_point, 1)) AS "totalEstimatePoints"',
            `SUM(CASE WHEN LOWER(st.name) = 'done' THEN 1 ELSE 0 END) AS "completedTasks"`,
            `SUM(CASE WHEN LOWER(st.name) = 'done' THEN COALESCE(task.estimated_point, 1) ELSE 0 END) AS "totalActualPoints"`,
            `SUM(CASE WHEN LOWER(st.name) = 'done' AND task.due_date IS NOT NULL AND task.completed_at IS NOT NULL AND ${buildTaskDoneOnTimeSql()} THEN 1 ELSE 0 END) AS "onTimeTasks"`,
            `SUM(CASE WHEN LOWER(st.name) = 'done' AND task.due_date IS NOT NULL AND task.completed_at IS NOT NULL AND ${buildTaskDoneLateSql()} THEN 1 ELSE 0 END) AS "lateTasks"`,
            `SUM(CASE WHEN (st.id IS NULL OR LOWER(st.name) != 'done') AND task.due_date IS NOT NULL AND ${buildTaskDuePassedSql()} THEN 1 ELSE 0 END) AS "overdueTasks"`,
          ])
          .where('task.project_id = :projectId', { projectId })
          .andWhere('task.organization_id = :orgId', { orgId })
          .andWhere('task.assigned_to = :targetUserId', { targetUserId })
          .andWhere('task.deleted_at IS NULL')
          .andWhere('child.id IS NULL')
          .setParameter('now', now)
          .getRawOne();

        const te = Number(pRows?.totalEstimatePoints) || 0;
        const ta = Number(pRows?.totalActualPoints) || 0;
        const tt = Number(pRows?.totalAssigned) || 0;
        const ct = Number(pRows?.completedTasks) || 0;
        const ot = Number(pRows?.onTimeTasks) || 0;
        const od = Number(pRows?.overdueTasks) || 0;

        const weights = await this.kpiSettingsResolver.resolveWeights(
          projectId,
          orgId,
        );
        const pRates = calcRates({
          totalAssigned: tt,
          completedTasks: ct,
          onTimeTasks: ot,
          overdueTasks: od,
          totalEstimatePoints: te,
          totalActualPoints: ta,
        });
        const baseScore = calcBasePerformanceScore(
          pRates.pointCompletionRate,
          pRates.onTimeRate,
          0,
          weights,
        );
        const finalScore = calcFinalScore(baseScore, 0);

        return {
          projectId,
          projectName: project.name,
          projectStatus: project.status,
          totalAssigned: tt,
          completedTasks: ct,
          openTasks: tt - ct,
          onTimeTasks: ot,
          lateTasks: Number(pRows?.lateTasks) || 0,
          overdueTasks: od,
          totalEstimatePoints: te,
          totalActualPoints: ta,
          openPoints: te - ta,
          pointCompletionRate: pRates.pointCompletionRate,
          completionRate: pRates.completionRate,
          onTimeRate: pRates.onTimeRate,
          overdueRate: pRates.overdueRate,
          performanceScore: finalScore,
        };
      }),
    );

    // OT details — query by effort owner (not requester) since OT tickets are created by org_admin
    const allTickets = await this.ticketRepo
      .createQueryBuilder('tr')
      .where('tr.organization_id = :orgId', { orgId })
      .andWhere('tr.type = :type', { type: TicketRequestType.OVERTIME })
      .andWhere('tr.status = :status', { status: TicketRequestStatus.APPROVED })
      .andWhere('tr.deleted_at IS NULL')
      .andWhere(
        `(tr.effort_owner_id = :targetUserId OR COALESCE(tr.ot_metadata->'effortOwnerIds', '[]'::jsonb) @> CAST(:effortOwnerIds AS jsonb))`,
        { targetUserId, effortOwnerIds: JSON.stringify([targetUserId]) },
      )
      .getMany();

    const multipliers =
      await this.kpiSettingsResolver.resolveOtMultipliers(orgId);
    const holidays =
      (await this.workingTimeService['holidayRepo']?.find?.({
        where: { organizationId: orgId },
      })) ?? [];
    const holidaySet = new Set(holidays.map((h: any) => h.date as string));

    let totalOtHours = 0,
      effectiveOtHours = 0;
    const breakdown: any[] = [];

    for (const ticket of allTickets) {
      const entries = (ticket.otMetadata as any)?.effortEntries ?? [];
      for (const entry of entries) {
        const isHoliday = holidaySet.has(entry.date);
        const dow = new Date(entry.date).getDay();
        const mult = isHoliday
          ? multipliers.holiday
          : dow === 0
            ? multipliers.sunday
            : dow === 6
              ? multipliers.saturday
              : multipliers.weekday;
        const h = Number(entry.hours);
        totalOtHours += h;
        effectiveOtHours += h * mult;
        breakdown.push({
          ticketId: ticket.id,
          ticketCode: ticket.code,
          date: entry.date,
          hours: h,
          multiplier: mult,
          effectiveHours: h * mult,
        });
      }
    }

    // Ticket summary — include tickets where user is requester OR OT effort owner
    const userTickets = await this.ticketRepo
      .createQueryBuilder('tr')
      .where('tr.organization_id = :orgId', { orgId })
      .andWhere('tr.deleted_at IS NULL')
      .andWhere(
        `(
          tr.requester_id = :targetUserId
          OR (
            tr.type = :otType
            AND (
              tr.effort_owner_id = :targetUserId
              OR COALESCE(tr.ot_metadata->'effortOwnerIds', '[]'::jsonb) @> CAST(:effortOwnerIds AS jsonb)
            )
          )
        )`,
        {
          targetUserId,
          otType: TicketRequestType.OVERTIME,
          effortOwnerIds: JSON.stringify([targetUserId]),
        },
      )
      .getMany();
    const ticketSummary = {
      total: userTickets.length,
      pending: userTickets.filter(
        (t) =>
          t.status === TicketRequestStatus.PENDING_APPROVAL ||
          t.status === TicketRequestStatus.PENDING_SUBMISSION,
      ).length,
      approved: userTickets.filter(
        (t) => t.status === TicketRequestStatus.APPROVED,
      ).length,
      rejected: userTickets.filter(
        (t) => t.status === TicketRequestStatus.REJECTED,
      ).length,
      byType: {
        leave: userTickets.filter((t) => t.type === TicketRequestType.LEAVE)
          .length,
        wfh: userTickets.filter((t) => t.type === TicketRequestType.WFH).length,
        overtime: userTickets.filter(
          (t) => t.type === TicketRequestType.OVERTIME,
        ).length,
        advance: userTickets.filter((t) => t.type === TicketRequestType.ADVANCE)
          .length,
        general: userTickets.filter((t) => t.type === TicketRequestType.GENERAL)
          .length,
      },
    };

    return {
      userId: targetUserId,
      fullName: user
        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
        : undefined,
      email: user?.email,
      avatar: user?.avatarUrl,
      aggregate: {
        projectCount: base.projectCount,
        activeProjectCount: base.activeProjectCount,
        totalAssigned: base.totalAssigned,
        completedTasks: base.completedTasks,
        openTasks: base.openTasks,
        onTimeTasks: base.onTimeTasks,
        lateTasks: base.lateTasks,
        overdueTasks: base.overdueTasks,
        dueSoonTasks: base.dueSoonTasks,
        totalEstimatePoints: base.totalEstimatePoints,
        totalActualPoints: base.totalActualPoints,
        openPoints: base.openPoints,
        pointCompletionRate: base.pointCompletionRate,
        totalEstimatedHours: base.totalEstimatedHours,
        expectedWorkingHours: base.expectedWorkingHours,
        approvedOtTickets: base.approvedOtTickets,
        totalOtHours: base.totalOtHours,
        effectiveOtHours: base.effectiveOtHours,
        completionRate: base.completionRate,
        onTimeRate: base.onTimeRate,
        overdueRate: base.overdueRate,
        performanceScore: base.performanceScore,
      },
      byProject: byProject.filter(Boolean) as any[],
      ot: {
        approvedOtTickets: allTickets.length,
        totalOtHours: Math.round(totalOtHours * 100) / 100,
        effectiveOtHours: Math.round(effectiveOtHours * 100) / 100,
        breakdown,
      },
      tickets: ticketSummary,
    };
  }

  private async hasOrgPermission(
    userId: string,
    orgId: string,
    permissionCode: string,
  ): Promise<boolean> {
    const permission = await this.permissionRepo.findOne({
      where: { code: permissionCode },
    });
    if (!permission) return false;
    const row = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(RolePermission, 'rp', 'rp.role_id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scope', { scope: ScopeType.ORGANIZATION })
      .andWhere('rp.permission_id = :permId', { permId: permission.id })
      .getOne();
    return !!row;
  }
}
