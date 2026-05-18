import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { OrgHoliday } from '@modules/organization/working-time/entities/org-holiday.entity';
import { WorkingTimeService } from '@modules/organization/working-time/working-time.service';
import { PeriodicReportScope } from '@modules/organization/settings/constants/periodic-report-settings.constant';
import { KpiActualService } from '@modules/analytics/kpi-actual.service';
import { KpiSettingsResolver } from '@modules/analytics/kpi-settings-resolver.service';
import {
  calcBasePerformanceScore,
  calcBonusPoints,
  calcFinalScore,
  calcOtContributionScore,
  calcRates,
} from '@modules/analytics/kpi-formula.helper';
import { Project } from '@modules/project/core/entities/project.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Task } from '@modules/project/task-management/entities/task.entity';
import {
  buildTaskDoneLateSql,
  buildTaskDoneOnTimeSql,
} from '@modules/project/task-management/utils/task-due-date.helper';
import {
  TicketRequest,
  TicketRequestStatus,
  TicketRequestType,
} from '@modules/ticket-request/core/entities/ticket-request.entity';
import { User } from '@modules/users/entities/user.entity';
import { In, IsNull, Repository } from 'typeorm';
import { PeriodicReportPeriodService } from './periodic-report-period.service';
import {
  PeriodicMemberKpiItem,
  PeriodicOrgSummary,
  PeriodicProjectSummaryItem,
  PeriodicReportSummarySnapshot,
} from './types/periodic-report.types';

type WindowedTaskStats = {
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  overdueTasks: number;
  totalEstimatePoints: number;
  totalActualPoints: number;
  totalEstimatedHours: number;
  completedEstimatedHours: number;
  earlyTasks: number;
};

@Injectable()
export class PeriodicReportBuilderService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly orgMemberRepo: Repository<OrganizationMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TicketRequest)
    private readonly ticketRepo: Repository<TicketRequest>,
    @InjectRepository(OrgHoliday)
    private readonly holidayRepo: Repository<OrgHoliday>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly kpiActualService: KpiActualService,
    private readonly kpiSettingsResolver: KpiSettingsResolver,
    private readonly workingTimeService: WorkingTimeService,
    private readonly periodService: PeriodicReportPeriodService,
  ) {}

  async buildSnapshot(params: {
    organization: Organization;
    periodKey: string;
    periodStart: string;
    periodEnd: string;
    timeZone: string;
    scopes: PeriodicReportScope[];
    projectIds?: string[];
  }): Promise<PeriodicReportSummarySnapshot> {
    const timeZone = this.periodService.normalizeTimeZone(params.timeZone);
    const scopedProjectIds = await this.resolveScopedProjectIds(
      params.organization.id,
      params.projectIds,
    );
    if (params.projectIds && scopedProjectIds && !scopedProjectIds.length) {
      return {
        reportType: 'periodic',
        periodKey: params.periodKey,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        timeZone,
        generatedAt: new Date().toISOString(),
        scopes: params.scopes,
        projectScopeIds: [],
        orgSummary: undefined,
        projectSummary: [],
        memberKpi: [],
      };
    }
    const dateFrom = this.periodService.zonedDateTimeToUtc(
      params.periodStart,
      timeZone,
      0,
      0,
      0,
      0,
    );
    const dateTo = this.periodService.zonedDateTimeToUtc(
      params.periodEnd,
      timeZone,
      23,
      59,
      59,
      999,
    );

    const activeMemberIds =
      scopedProjectIds !== undefined
        ? await this.queryScopedActiveMemberIds(
            params.organization.id,
            scopedProjectIds,
          )
        : await this.queryOrganizationActiveMemberIds(params.organization.id);
    const approvedOtTickets = await this.ticketRepo.find({
      where: {
        organizationId: params.organization.id,
        type: TicketRequestType.OVERTIME,
        status: TicketRequestStatus.APPROVED,
      },
    });
    const scopedApprovedOtTickets = this.filterTicketsByProjectIds(
      approvedOtTickets,
      scopedProjectIds,
    );

    const memberKpi =
      params.scopes.includes(PeriodicReportScope.MEMBER_KPI) ||
      params.scopes.includes(PeriodicReportScope.ORG_SUMMARY)
        ? await this.buildMemberKpi(
            params.organization.id,
            activeMemberIds,
            dateFrom,
            dateTo,
            params.periodStart,
            params.periodEnd,
            scopedApprovedOtTickets,
            scopedProjectIds,
          )
        : [];

    const projectSummary = params.scopes.includes(
      PeriodicReportScope.PROJECT_SUMMARY,
    )
      ? await this.buildProjectSummary(
          params.organization.id,
          dateFrom,
          dateTo,
          params.periodStart,
          params.periodEnd,
          scopedApprovedOtTickets,
          scopedProjectIds,
        )
      : [];

    const orgSummary = params.scopes.includes(PeriodicReportScope.ORG_SUMMARY)
      ? await this.buildOrgSummary(
          params.organization,
          dateFrom,
          dateTo,
          params.periodStart,
          params.periodEnd,
          scopedApprovedOtTickets,
          activeMemberIds.length,
          scopedProjectIds,
        )
      : undefined;

    return {
      reportType: 'periodic',
      periodKey: params.periodKey,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      timeZone,
      generatedAt: new Date().toISOString(),
      scopes: params.scopes,
      projectScopeIds: scopedProjectIds,
      orgSummary,
      projectSummary,
      memberKpi: params.scopes.includes(PeriodicReportScope.MEMBER_KPI)
        ? memberKpi
        : [],
    };
  }

  private async buildOrgSummary(
    organization: Organization,
    dateFrom: Date,
    dateTo: Date,
    periodStart: string,
    periodEnd: string,
    approvedOtTickets: TicketRequest[],
    activeMemberCount: number,
    projectIds?: string[],
  ): Promise<PeriodicOrgSummary> {
    const [taskStats, projects, ticketSummary, otSummary] = await Promise.all([
      this.queryTaskStats(organization.id, dateFrom, dateTo, projectIds),
      this.projectRepo.find({
        where: this.buildProjectWhere(organization.id, projectIds),
      }),
      this.buildTicketSummary(organization.id, dateFrom, dateTo, projectIds),
      Promise.resolve(
        this.buildApprovedOtSummary(approvedOtTickets, periodStart, periodEnd),
      ),
    ]);

    const rates = calcRates({
      totalAssigned: taskStats.totalTasks,
      completedTasks: taskStats.completedTasks,
      onTimeTasks: taskStats.onTimeTasks,
      overdueTasks: taskStats.overdueTasks,
      totalEstimatePoints: taskStats.totalEstimatePoints,
      totalActualPoints: taskStats.totalActualPoints,
    });

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      totalMembers: activeMemberCount,
      activeMembers: activeMemberCount,
      totalProjects: projects.length,
      activeProjects: projects.filter((project) => project.status === 'active')
        .length,
      completedProjects: projects.filter(
        (project) => project.status === 'completed',
      ).length,
      onHoldProjects: projects.filter((project) => project.status === 'on_hold')
        .length,
      cancelledProjects: projects.filter(
        (project) => project.status === 'cancelled',
      ).length,
      totalTasks: taskStats.totalTasks,
      completedTasks: taskStats.completedTasks,
      overdueTasks: taskStats.overdueTasks,
      totalEstimatePoints: taskStats.totalEstimatePoints,
      totalActualPoints: taskStats.totalActualPoints,
      completionRate: rates.completionRate,
      pointCompletionRate: rates.pointCompletionRate,
      onTimeRate: rates.onTimeRate,
      totalTickets: ticketSummary.totalTickets,
      pendingTickets: ticketSummary.pendingTickets,
      approvedTickets: ticketSummary.approvedTickets,
      rejectedTickets: ticketSummary.rejectedTickets,
      totalApprovedOtTickets: otSummary.ticketCount,
      totalOtHours: otSummary.totalOtHours,
    };
  }

  private async buildMemberKpi(
    organizationId: string,
    memberIds: string[],
    dateFrom: Date,
    dateTo: Date,
    periodStart: string,
    periodEnd: string,
    approvedOtTickets: TicketRequest[],
    projectIds?: string[],
  ): Promise<PeriodicMemberKpiItem[]> {
    if (!memberIds.length) return [];

    if (projectIds?.length) {
      return this.buildScopedMemberKpi(
        organizationId,
        memberIds,
        dateFrom,
        dateTo,
        periodStart,
        periodEnd,
        approvedOtTickets,
        projectIds,
      );
    }

    const [actualMap, users, projectCountMap, approvedOtMetricsByUser] =
      await Promise.all([
        this.kpiActualService.computeOrgMembersActual(
          organizationId,
          memberIds,
          {
            dateFrom,
            dateTo,
            now: dateTo,
          },
        ),
        this.userRepo.find({
          where: { id: In(memberIds), deletedAt: IsNull() },
        }),
        this.queryMemberProjectCounts(organizationId, dateFrom, dateTo),
        this.buildApprovedOtMetricsByUser(
          organizationId,
          approvedOtTickets,
          periodStart,
          periodEnd,
        ),
      ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const items: PeriodicMemberKpiItem[] = [];

    for (const userId of memberIds) {
      const actual = actualMap.get(userId);
      if (!actual) continue;

      const approvedOtMetrics = approvedOtMetricsByUser.get(userId) ?? {
        ticketCount: 0,
        totalOtHours: 0,
        effectiveOtHours: 0,
      };
      const approvedOtTicketCount = approvedOtMetrics.ticketCount;
      const projectCount = projectCountMap.get(userId) ?? 0;
      if (
        actual.totalAssigned === 0 &&
        actual.completedTasks === 0 &&
        actual.totalOtHours === 0 &&
        approvedOtTicketCount === 0 &&
        projectCount === 0
      ) {
        continue;
      }

      const user = userMap.get(userId);
      items.push({
        userId,
        fullName:
          [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
          user?.email ||
          userId,
        email: user?.email,
        projectCount,
        activeProjectCount: projectCount,
        totalAssigned: actual.totalAssigned,
        completedTasks: actual.completedTasks,
        openTasks: actual.openTasks,
        onTimeTasks: actual.onTimeTasks,
        lateTasks: actual.lateTasks,
        overdueTasks: actual.overdueTasks,
        dueSoonTasks: actual.dueSoonTasks,
        totalEstimatePoints: actual.totalEstimatePoints,
        totalActualPoints: actual.totalActualPoints,
        totalEstimatedHours: actual.totalEstimatedHours,
        expectedWorkingHours: actual.expectedWorkingHours,
        approvedOtTickets: approvedOtTicketCount,
        totalOtHours: actual.totalOtHours,
        effectiveOtHours: actual.effectiveOtHours,
        completionRate: actual.completionRate,
        pointCompletionRate: actual.pointCompletionRate,
        onTimeRate: actual.onTimeRate,
        overdueRate: actual.overdueRate,
        performanceScore: actual.performanceScore,
      });
    }

    return items.sort(
      (a, b) =>
        b.performanceScore - a.performanceScore ||
        b.completedTasks - a.completedTasks,
    );
  }

  private async buildScopedMemberKpi(
    organizationId: string,
    memberIds: string[],
    dateFrom: Date,
    dateTo: Date,
    periodStart: string,
    periodEnd: string,
    approvedOtTickets: TicketRequest[],
    projectIds: string[],
  ): Promise<PeriodicMemberKpiItem[]> {
    const scopedMemberIds = [
      ...new Set([
        ...memberIds,
        ...approvedOtTickets
          .map((ticket) => ticket.requesterId)
          .filter(Boolean),
      ]),
    ];
    if (!scopedMemberIds.length) {
      return [];
    }

    const bonusRules = await this.kpiSettingsResolver.resolveBonusRules(
      null,
      organizationId,
    );
    const [
      users,
      taskStatsMap,
      projectCountMap,
      approvedOtMetricsByUser,
      weights,
      memberRows,
    ] = await Promise.all([
      this.userRepo.find({
        where: { id: In(scopedMemberIds), deletedAt: IsNull() },
      }),
      this.queryMemberTaskStatsMap(
        organizationId,
        dateFrom,
        dateTo,
        Math.max(0, bonusRules.bonusEarlyTaskHours),
        projectIds,
      ),
      this.queryMemberProjectCounts(
        organizationId,
        dateFrom,
        dateTo,
        projectIds,
      ),
      this.buildApprovedOtMetricsByUser(
        organizationId,
        approvedOtTickets,
        periodStart,
        periodEnd,
      ),
      this.kpiSettingsResolver.resolveWeights(null, organizationId),
      this.projectMemberRepo.find({
        where: {
          organizationId,
          projectId: In(projectIds),
          userId: In(scopedMemberIds),
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const allocatedHoursByUser = new Map<string, number>();
    memberRows.forEach((row) => {
      const allocation = Number(row.allocatedHoursPerDay ?? 0);
      allocatedHoursByUser.set(
        row.userId,
        (allocatedHoursByUser.get(row.userId) ?? 0) + allocation,
      );
    });

    const expectedWorkingHoursCache = new Map<string, number>();
    const items: PeriodicMemberKpiItem[] = [];

    for (const userId of scopedMemberIds) {
      const row = taskStatsMap.get(userId);
      const approvedOtMetrics = approvedOtMetricsByUser.get(userId) ?? {
        ticketCount: 0,
        totalOtHours: 0,
        effectiveOtHours: 0,
      };
      const projectCount = projectCountMap.get(userId) ?? 0;
      const totalAssigned = Number(row?.totalAssigned) || 0;
      const completedTasks = Number(row?.completedTasks) || 0;
      const overdueTasks = Number(row?.overdueTasks) || 0;
      const onTimeTasks = Number(row?.onTimeTasks) || 0;
      const totalEstimatePoints = Number(row?.totalEstimatePoints) || 0;
      const totalActualPoints = Number(row?.totalActualPoints) || 0;

      if (
        totalAssigned === 0 &&
        completedTasks === 0 &&
        approvedOtMetrics.totalOtHours === 0 &&
        approvedOtMetrics.ticketCount === 0 &&
        projectCount === 0
      ) {
        continue;
      }

      const rates = calcRates({
        totalAssigned,
        completedTasks,
        onTimeTasks,
        overdueTasks,
        totalEstimatePoints,
        totalActualPoints,
      });
      const allocationKey =
        allocatedHoursByUser.get(userId) != null &&
        allocatedHoursByUser.get(userId)! > 0
          ? `${allocatedHoursByUser.get(userId)}`
          : 'org-default';
      let expectedWorkingHours = expectedWorkingHoursCache.get(allocationKey);
      if (expectedWorkingHours == null) {
        expectedWorkingHours =
          await this.workingTimeService.calcExpectedWorkingHours(
            organizationId,
            dateFrom,
            dateTo,
            allocationKey === 'org-default'
              ? null
              : Number(allocatedHoursByUser.get(userId)),
          );
        expectedWorkingHoursCache.set(allocationKey, expectedWorkingHours);
      }

      const otScore = calcOtContributionScore(
        approvedOtMetrics.effectiveOtHours,
        expectedWorkingHours,
      );
      const baseScore = calcBasePerformanceScore(
        rates.pointCompletionRate,
        rates.onTimeRate,
        otScore,
        weights,
      );
      const bonusPoints = calcBonusPoints(
        {
          onTimeTasks,
          earlyTasks: Number(row?.earlyTasks) || 0,
          hasZeroOverdue: overdueTasks === 0,
          effectiveOtHours: approvedOtMetrics.effectiveOtHours,
        },
        bonusRules,
      );
      const performanceScore = calcFinalScore(baseScore, bonusPoints);

      const user = userMap.get(userId);
      items.push({
        userId,
        fullName:
          [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
          user?.email ||
          userId,
        email: user?.email,
        projectCount,
        activeProjectCount: projectCount,
        totalAssigned,
        completedTasks,
        openTasks: Math.max(totalAssigned - completedTasks, 0),
        onTimeTasks,
        lateTasks: Number(row?.lateTasks) || 0,
        overdueTasks,
        dueSoonTasks: Number(row?.dueSoonTasks) || 0,
        totalEstimatePoints,
        totalActualPoints,
        totalEstimatedHours: row?.totalEstimatedHours
          ? Number(row.totalEstimatedHours)
          : undefined,
        expectedWorkingHours,
        approvedOtTickets: approvedOtMetrics.ticketCount,
        totalOtHours: approvedOtMetrics.totalOtHours,
        effectiveOtHours: approvedOtMetrics.effectiveOtHours,
        completionRate: rates.completionRate,
        pointCompletionRate: rates.pointCompletionRate,
        onTimeRate: rates.onTimeRate,
        overdueRate: rates.overdueRate,
        performanceScore,
      });
    }

    return items.sort(
      (a, b) =>
        b.performanceScore - a.performanceScore ||
        b.completedTasks - a.completedTasks,
    );
  }

  private async buildProjectSummary(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    periodStart: string,
    periodEnd: string,
    approvedOtTickets: TicketRequest[],
    allowedProjectIds?: string[],
  ): Promise<PeriodicProjectSummaryItem[]> {
    const projectIds = await this.queryProjectIdsWithActivity(
      organizationId,
      dateFrom,
      dateTo,
      periodStart,
      periodEnd,
      approvedOtTickets,
      allowedProjectIds,
    );
    if (!projectIds.length) {
      return [];
    }

    const [projects, approvedOtMetricsByProject] = await Promise.all([
      this.projectRepo.find({
        where: {
          organizationId,
          id: In(projectIds),
        },
      }),
      this.buildApprovedOtMetricsByProject(
        organizationId,
        approvedOtTickets,
        periodStart,
        periodEnd,
      ),
    ]);

    const items: PeriodicProjectSummaryItem[] = [];
    for (const project of projects) {
      const [taskStats, memberCount, userIds, weights, bonusRules] =
        await Promise.all([
          this.queryTaskStats(organizationId, dateFrom, dateTo, [project.id]),
          this.projectMemberRepo.count({
            where: {
              organizationId,
              projectId: project.id,
              isActive: true,
              deletedAt: IsNull(),
            },
          }),
          this.queryProjectUserIds(
            project.id,
            organizationId,
            dateFrom,
            dateTo,
          ),
          this.kpiSettingsResolver.resolveWeights(project.id, organizationId),
          this.kpiSettingsResolver.resolveBonusRules(
            project.id,
            organizationId,
          ),
        ]);

      const actualMap = userIds.length
        ? await this.kpiActualService.computeProjectMembersActual(
            project.id,
            organizationId,
            userIds,
            {
              dateFrom,
              dateTo,
              now: dateTo,
            },
          )
        : new Map();

      const expectedWorkingHours = [...actualMap.values()].reduce(
        (sum, metrics) => sum + (metrics.expectedWorkingHours ?? 0),
        0,
      );
      const otMetrics = approvedOtMetricsByProject.get(project.id) ?? {
        ticketCount: 0,
        totalOtHours: 0,
        effectiveOtHours: 0,
      };
      const totalOtHours = otMetrics.totalOtHours;
      const effectiveOtHours = otMetrics.effectiveOtHours;
      const rates = calcRates({
        totalAssigned: taskStats.totalTasks,
        completedTasks: taskStats.completedTasks,
        onTimeTasks: taskStats.onTimeTasks,
        overdueTasks: taskStats.overdueTasks,
        totalEstimatePoints: taskStats.totalEstimatePoints,
        totalActualPoints: taskStats.totalActualPoints,
      });
      const otScore = calcOtContributionScore(
        effectiveOtHours,
        expectedWorkingHours,
      );
      const baseScore = calcBasePerformanceScore(
        rates.pointCompletionRate,
        rates.onTimeRate,
        otScore,
        weights,
      );
      const bonusPoints = calcBonusPoints(
        {
          onTimeTasks: taskStats.onTimeTasks,
          earlyTasks: taskStats.earlyTasks,
          hasZeroOverdue: taskStats.overdueTasks === 0,
          effectiveOtHours,
        },
        bonusRules,
      );
      const performanceScore = calcFinalScore(baseScore, bonusPoints);

      items.push({
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        priority: project.priority,
        memberCount,
        totalAssigned: taskStats.totalTasks,
        completedTasks: taskStats.completedTasks,
        openTasks: Math.max(taskStats.totalTasks - taskStats.completedTasks, 0),
        onTimeTasks: taskStats.onTimeTasks,
        lateTasks: taskStats.lateTasks,
        overdueTasks: taskStats.overdueTasks,
        totalEstimatePoints: taskStats.totalEstimatePoints,
        totalActualPoints: taskStats.totalActualPoints,
        totalEstimatedHours: taskStats.totalEstimatedHours,
        approvedOtTickets: otMetrics.ticketCount,
        totalOtHours: Math.round(totalOtHours * 100) / 100,
        effectiveOtHours: Math.round(effectiveOtHours * 100) / 100,
        completionRate: rates.completionRate,
        pointCompletionRate: rates.pointCompletionRate,
        onTimeRate: rates.onTimeRate,
        overdueRate: rates.overdueRate,
        performanceScore,
        riskLevel: this.resolveProjectRiskLevel(
          rates.overdueRate,
          rates.onTimeRate,
          performanceScore,
        ),
      });
    }

    return items.sort(
      (a, b) =>
        b.performanceScore - a.performanceScore ||
        a.overdueTasks - b.overdueTasks,
    );
  }

  private async buildTicketSummary(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectIds?: string[],
  ): Promise<{
    totalTickets: number;
    pendingTickets: number;
    approvedTickets: number;
    rejectedTickets: number;
  }> {
    const tickets = await this.ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.organization_id = :organizationId', { organizationId })
      .andWhere('ticket.created_at >= :dateFrom', { dateFrom })
      .andWhere('ticket.created_at <= :dateTo', { dateTo })
      .getMany();
    const scopedTickets = this.filterTicketsByProjectIds(tickets, projectIds);

    return {
      totalTickets: scopedTickets.length,
      pendingTickets: scopedTickets.filter(
        (ticket) =>
          ticket.status === TicketRequestStatus.PENDING_APPROVAL ||
          ticket.status === TicketRequestStatus.PENDING_SUBMISSION,
      ).length,
      approvedTickets: scopedTickets.filter(
        (ticket) => ticket.status === TicketRequestStatus.APPROVED,
      ).length,
      rejectedTickets: scopedTickets.filter(
        (ticket) => ticket.status === TicketRequestStatus.REJECTED,
      ).length,
    };
  }

  private buildApprovedOtSummary(
    tickets: TicketRequest[],
    periodStart: string,
    periodEnd: string,
  ): { ticketCount: number; totalOtHours: number } {
    let totalOtHours = 0;
    let ticketCount = 0;

    for (const ticket of tickets) {
      const entries = this.getOtEntriesInRange(ticket, periodStart, periodEnd);
      if (!entries.length) continue;
      ticketCount += 1;
      totalOtHours += entries.reduce(
        (sum, entry) => sum + Number(entry.hours),
        0,
      );
    }

    return {
      ticketCount,
      totalOtHours: Math.round(totalOtHours * 100) / 100,
    };
  }

  private async buildApprovedOtMetricsByUser(
    organizationId: string,
    tickets: TicketRequest[],
    periodStart: string,
    periodEnd: string,
  ): Promise<
    Map<
      string,
      { ticketCount: number; totalOtHours: number; effectiveOtHours: number }
    >
  > {
    return this.buildApprovedOtMetrics(
      organizationId,
      tickets,
      periodStart,
      periodEnd,
      (ticket) => ticket.requesterId,
    );
  }

  private async buildApprovedOtMetricsByProject(
    organizationId: string,
    tickets: TicketRequest[],
    periodStart: string,
    periodEnd: string,
  ): Promise<
    Map<
      string,
      { ticketCount: number; totalOtHours: number; effectiveOtHours: number }
    >
  > {
    return this.buildApprovedOtMetrics(
      organizationId,
      tickets,
      periodStart,
      periodEnd,
      (ticket) => this.getTicketProjectId(ticket),
    );
  }

  private async buildApprovedOtMetrics(
    organizationId: string,
    tickets: TicketRequest[],
    periodStart: string,
    periodEnd: string,
    groupKeyFactory: (ticket: TicketRequest) => string | undefined,
  ): Promise<
    Map<
      string,
      { ticketCount: number; totalOtHours: number; effectiveOtHours: number }
    >
  > {
    if (!tickets.length) {
      return new Map();
    }

    const [multipliers, holidays] = await Promise.all([
      this.kpiSettingsResolver.resolveOtMultipliers(organizationId),
      this.holidayRepo.find({
        where: { organizationId, deletedAt: IsNull() },
      }),
    ]);
    const holidaySet = new Set(holidays.map((holiday) => holiday.date));
    const map = new Map<
      string,
      { ticketCount: number; totalOtHours: number; effectiveOtHours: number }
    >();

    for (const ticket of tickets) {
      const key = groupKeyFactory(ticket);
      if (!key) continue;

      const entries = this.getOtEntriesInRange(ticket, periodStart, periodEnd);
      if (!entries.length) continue;

      let totalOtHours = 0;
      let effectiveOtHours = 0;
      for (const entry of entries) {
        const hours = Number(entry.hours) || 0;
        totalOtHours += hours;
        effectiveOtHours +=
          hours * this.resolveOtMultiplier(entry.date, holidaySet, multipliers);
      }

      const current = map.get(key) ?? {
        ticketCount: 0,
        totalOtHours: 0,
        effectiveOtHours: 0,
      };
      current.ticketCount += 1;
      current.totalOtHours += totalOtHours;
      current.effectiveOtHours += effectiveOtHours;
      map.set(key, current);
    }

    for (const [key, metrics] of map.entries()) {
      map.set(key, {
        ticketCount: metrics.ticketCount,
        totalOtHours: Math.round(metrics.totalOtHours * 100) / 100,
        effectiveOtHours: Math.round(metrics.effectiveOtHours * 100) / 100,
      });
    }

    return map;
  }

  private getOtEntriesInRange(
    ticket: TicketRequest,
    periodStart: string,
    periodEnd: string,
  ): Array<{ date: string; hours: number }> {
    const entries =
      (
        ticket.otMetadata as {
          effortEntries?: Array<{ date: string; hours: number }>;
        }
      )?.effortEntries ?? [];
    return entries.filter(
      (entry) => entry.date >= periodStart && entry.date <= periodEnd,
    );
  }

  private resolveProjectRiskLevel(
    overdueRate: number,
    onTimeRate: number,
    performanceScore: number,
  ): 'low' | 'medium' | 'high' {
    if (overdueRate >= 25 || performanceScore < 50 || onTimeRate < 60) {
      return 'high';
    }
    if (overdueRate >= 10 || performanceScore < 75 || onTimeRate < 80) {
      return 'medium';
    }
    return 'low';
  }

  private async resolveScopedProjectIds(
    organizationId: string,
    projectIds?: string[],
  ): Promise<string[] | undefined> {
    if (!projectIds?.length) {
      return undefined;
    }

    const projects = await this.projectRepo.find({
      where: {
        organizationId,
        id: In(projectIds),
        deletedAt: IsNull(),
      },
    });
    return [...new Set(projects.map((project) => project.id))];
  }

  private async queryOrganizationActiveMemberIds(
    organizationId: string,
  ): Promise<string[]> {
    const activeMembers = await this.orgMemberRepo.find({
      where: {
        organizationId,
        isActive: true,
        isDeleted: false,
      },
    });
    return [...new Set(activeMembers.map((item) => item.userId))];
  }

  private async queryScopedActiveMemberIds(
    organizationId: string,
    projectIds: string[],
  ): Promise<string[]> {
    if (!projectIds.length) {
      return [];
    }

    const rows = await this.projectMemberRepo.find({
      where: {
        organizationId,
        projectId: In(projectIds),
        isActive: true,
        deletedAt: IsNull(),
      },
    });
    return [...new Set(rows.map((item) => item.userId))];
  }

  private async queryMemberTaskStatsMap(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    bonusEarlyTaskHours: number,
    projectIds?: string[],
  ): Promise<Map<string, Record<string, string>>> {
    const completedExpr =
      'task.completed_at IS NOT NULL AND task.completed_at >= :dateFrom AND task.completed_at <= :dateTo';
    const openByPeriodExpr =
      '(task.completed_at IS NULL OR task.completed_at > :dateTo)';
    const membershipExpr = this.buildMembershipExpr(
      completedExpr,
      openByPeriodExpr,
    );
    const overdueExpr = `task.due_date IS NOT NULL AND task.due_date < :dateTo AND ${openByPeriodExpr}`;

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        Task,
        'child',
        'child.parent_task_id = task.id AND child.organization_id = task.organization_id AND child.deleted_at IS NULL',
      )
      .select('task.assigned_to', 'userId')
      .addSelect(
        `SUM(CASE WHEN ${membershipExpr} THEN 1 ELSE 0 END)`,
        'totalAssigned',
      )
      .addSelect(
        `SUM(CASE WHEN ${membershipExpr} THEN COALESCE(task.estimated_point, 1) ELSE 0 END)`,
        'totalEstimatePoints',
      )
      .addSelect(
        `SUM(CASE WHEN ${membershipExpr} THEN COALESCE(task.estimated_hours, 0) ELSE 0 END)`,
        'totalEstimatedHours',
      )
      .addSelect(
        `SUM(CASE WHEN ${completedExpr} THEN 1 ELSE 0 END)`,
        'completedTasks',
      )
      .addSelect(
        `SUM(CASE WHEN ${completedExpr} THEN COALESCE(task.estimated_point, 1) ELSE 0 END)`,
        'totalActualPoints',
      )
      .addSelect(
        `SUM(CASE WHEN ${completedExpr} THEN COALESCE(task.estimated_hours, 0) ELSE 0 END)`,
        'completedEstimatedHours',
      )
      .addSelect(
        `SUM(CASE WHEN ${completedExpr} AND task.due_date IS NOT NULL AND ${buildTaskDoneOnTimeSql()} THEN 1 ELSE 0 END)`,
        'onTimeTasks',
      )
      .addSelect(
        `SUM(CASE WHEN ${completedExpr} AND task.due_date IS NOT NULL AND ${buildTaskDoneLateSql()} THEN 1 ELSE 0 END)`,
        'lateTasks',
      )
      .addSelect(
        `SUM(CASE WHEN ${overdueExpr} THEN 1 ELSE 0 END)`,
        'overdueTasks',
      )
      .addSelect('0', 'dueSoonTasks')
      .addSelect(
        `SUM(CASE WHEN ${completedExpr} AND task.due_date IS NOT NULL AND task.completed_at <= (task.due_date - interval '${Math.max(
          0,
          bonusEarlyTaskHours,
        )} hours') THEN 1 ELSE 0 END)`,
        'earlyTasks',
      )
      .where('task.organization_id = :organizationId', { organizationId })
      .andWhere('task.assigned_to IS NOT NULL')
      .andWhere('task.deleted_at IS NULL')
      .andWhere('child.id IS NULL')
      .setParameters({ dateFrom, dateTo })
      .groupBy('task.assigned_to');

    if (projectIds?.length) {
      qb.andWhere('task.project_id IN (:...projectIds)', { projectIds });
    }

    const rows = await qb.getRawMany<Record<string, string>>();
    return new Map(rows.map((row) => [row.userId, row]));
  }

  private buildProjectWhere(organizationId: string, projectIds?: string[]) {
    if (projectIds !== undefined) {
      return {
        organizationId,
        id: In(
          projectIds.length
            ? projectIds
            : ['00000000-0000-0000-0000-000000000000'],
        ),
        deletedAt: IsNull(),
      };
    }

    return { organizationId };
  }

  private filterTicketsByProjectIds(
    tickets: TicketRequest[],
    projectIds?: string[],
  ): TicketRequest[] {
    if (projectIds === undefined) {
      return tickets;
    }
    if (!projectIds.length) {
      return [];
    }

    const allowedProjectIds = new Set(projectIds);
    return tickets.filter((ticket) => {
      const projectId = this.getTicketProjectId(ticket);
      return !!projectId && allowedProjectIds.has(projectId);
    });
  }

  private getTicketProjectId(ticket: TicketRequest): string | undefined {
    return (ticket.otMetadata as { projectId?: string } | undefined)?.projectId;
  }

  private resolveOtMultiplier(
    dateStr: string,
    holidaySet: Set<string>,
    multipliers: {
      weekday: number;
      saturday: number;
      sunday: number;
      holiday: number;
    },
  ): number {
    if (holidaySet.has(dateStr)) return multipliers.holiday;
    const dayOfWeek = new Date(dateStr).getDay();
    if (dayOfWeek === 0) return multipliers.sunday;
    if (dayOfWeek === 6) return multipliers.saturday;
    return multipliers.weekday;
  }

  private async queryProjectIdsWithActivity(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    periodStart: string,
    periodEnd: string,
    approvedOtTickets: TicketRequest[],
    allowedProjectIds?: string[],
  ): Promise<string[]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        Task,
        'child',
        'child.parent_task_id = task.id AND child.organization_id = task.organization_id AND child.deleted_at IS NULL',
      )
      .select('DISTINCT task.project_id', 'projectId')
      .where('task.organization_id = :organizationId', { organizationId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('child.id IS NULL')
      .andWhere(this.buildMembershipExpr(), { dateFrom, dateTo });

    if (allowedProjectIds?.length) {
      qb.andWhere('task.project_id IN (:...allowedProjectIds)', {
        allowedProjectIds,
      });
    }

    const rows = await qb.getRawMany<{ projectId: string }>();

    const ids = new Set(rows.map((row) => row.projectId));
    approvedOtTickets.forEach((ticket) => {
      const projectId = this.getTicketProjectId(ticket);
      if (
        projectId &&
        (!allowedProjectIds?.length || allowedProjectIds.includes(projectId)) &&
        this.getOtEntriesInRange(ticket, periodStart, periodEnd).length > 0
      ) {
        ids.add(projectId);
      }
    });

    return [...ids];
  }

  private async queryProjectUserIds(
    projectId: string,
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<string[]> {
    const rows = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        Task,
        'child',
        'child.parent_task_id = task.id AND child.organization_id = task.organization_id AND child.deleted_at IS NULL',
      )
      .select('DISTINCT task.assigned_to', 'userId')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :organizationId', { organizationId })
      .andWhere('task.assigned_to IS NOT NULL')
      .andWhere('task.deleted_at IS NULL')
      .andWhere('child.id IS NULL')
      .andWhere(this.buildMembershipExpr(), { dateFrom, dateTo })
      .getRawMany<{ userId: string }>();

    return rows.map((row) => row.userId).filter(Boolean);
  }

  private async queryMemberProjectCounts(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectIds?: string[],
  ): Promise<Map<string, number>> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        Task,
        'child',
        'child.parent_task_id = task.id AND child.organization_id = task.organization_id AND child.deleted_at IS NULL',
      )
      .select('task.assigned_to', 'userId')
      .addSelect('COUNT(DISTINCT task.project_id)', 'projectCount')
      .where('task.organization_id = :organizationId', { organizationId })
      .andWhere('task.assigned_to IS NOT NULL')
      .andWhere('task.deleted_at IS NULL')
      .andWhere('child.id IS NULL')
      .andWhere(this.buildMembershipExpr(), { dateFrom, dateTo })
      .groupBy('task.assigned_to');

    if (projectIds?.length) {
      qb.andWhere('task.project_id IN (:...projectIds)', { projectIds });
    }

    const rows = await qb.getRawMany<{
      userId: string;
      projectCount: string;
    }>();

    return new Map(
      rows.map((row) => [row.userId, Number(row.projectCount) || 0]),
    );
  }

  private async queryTaskStats(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    projectIds?: string[],
  ): Promise<WindowedTaskStats> {
    const bonusRules = await this.kpiSettingsResolver.resolveBonusRules(
      projectIds?.length === 1 ? projectIds[0] : null,
      organizationId,
    );

    const completedExpr =
      'task.completed_at IS NOT NULL AND task.completed_at >= :dateFrom AND task.completed_at <= :dateTo';
    const openByPeriodExpr =
      '(task.completed_at IS NULL OR task.completed_at > :dateTo)';
    const membershipExpr = this.buildMembershipExpr(
      completedExpr,
      openByPeriodExpr,
    );
    const overdueExpr = `task.due_date IS NOT NULL AND task.due_date < :dateTo AND ${openByPeriodExpr}`;

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        Task,
        'child',
        'child.parent_task_id = task.id AND child.organization_id = task.organization_id AND child.deleted_at IS NULL',
      )
      .select([
        `SUM(CASE WHEN ${membershipExpr} THEN 1 ELSE 0 END) AS "totalTasks"`,
        `SUM(CASE WHEN ${membershipExpr} THEN COALESCE(task.estimated_point, 1) ELSE 0 END) AS "totalEstimatePoints"`,
        `SUM(CASE WHEN ${membershipExpr} THEN COALESCE(task.estimated_hours, 0) ELSE 0 END) AS "totalEstimatedHours"`,
        `SUM(CASE WHEN ${completedExpr} THEN 1 ELSE 0 END) AS "completedTasks"`,
        `SUM(CASE WHEN ${completedExpr} THEN COALESCE(task.estimated_point, 1) ELSE 0 END) AS "totalActualPoints"`,
        `SUM(CASE WHEN ${completedExpr} THEN COALESCE(task.estimated_hours, 0) ELSE 0 END) AS "completedEstimatedHours"`,
        `SUM(CASE WHEN ${completedExpr} AND task.due_date IS NOT NULL AND ${buildTaskDoneOnTimeSql()} THEN 1 ELSE 0 END) AS "onTimeTasks"`,
        `SUM(CASE WHEN ${completedExpr} AND task.due_date IS NOT NULL AND ${buildTaskDoneLateSql()} THEN 1 ELSE 0 END) AS "lateTasks"`,
        `SUM(CASE WHEN ${overdueExpr} THEN 1 ELSE 0 END) AS "overdueTasks"`,
        `SUM(CASE WHEN ${completedExpr} AND task.due_date IS NOT NULL AND task.completed_at <= (task.due_date - interval '${Math.max(
          0,
          bonusRules.bonusEarlyTaskHours,
        )} hours') THEN 1 ELSE 0 END) AS "earlyTasks"`,
      ])
      .where('task.organization_id = :organizationId', { organizationId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('child.id IS NULL')
      .setParameters({ dateFrom, dateTo });

    if (projectIds?.length) {
      qb.andWhere('task.project_id IN (:...projectIds)', { projectIds });
    }

    const row = await qb.getRawOne<Record<string, string>>();
    return {
      totalTasks: Number(row?.totalTasks) || 0,
      completedTasks: Number(row?.completedTasks) || 0,
      onTimeTasks: Number(row?.onTimeTasks) || 0,
      lateTasks: Number(row?.lateTasks) || 0,
      overdueTasks: Number(row?.overdueTasks) || 0,
      totalEstimatePoints: Number(row?.totalEstimatePoints) || 0,
      totalActualPoints: Number(row?.totalActualPoints) || 0,
      totalEstimatedHours: Number(row?.totalEstimatedHours) || 0,
      completedEstimatedHours: Number(row?.completedEstimatedHours) || 0,
      earlyTasks: Number(row?.earlyTasks) || 0,
    };
  }

  private buildMembershipExpr(
    completedExpr = 'task.completed_at IS NOT NULL AND task.completed_at >= :dateFrom AND task.completed_at <= :dateTo',
    openByPeriodExpr = '(task.completed_at IS NULL OR task.completed_at > :dateTo)',
  ): string {
    return `((${completedExpr}) OR (task.due_date IS NOT NULL AND task.due_date <= :dateTo AND ${openByPeriodExpr}))`;
  }
}
