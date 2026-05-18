import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Task } from '@modules/project/task-management/entities/task.entity';
import { StatusTask } from '@modules/project/status-task/entities/status-task.entity';
import { WorkingTimeService } from '@modules/organization/working-time/working-time.service';
import {
  buildTaskDoneLateSql,
  buildTaskDoneOnTimeSql,
  buildTaskDuePassedSql,
  buildTaskDueSoonSql,
} from '@modules/project/task-management/utils/task-due-date.helper';
import { KpiSettingsResolver } from './kpi-settings-resolver.service';
import {
  calcBasePerformanceScore,
  calcBonusPoints,
  calcFinalScore,
  calcOtContributionScore,
  calcRates,
} from './kpi-formula.helper';
import { KpiTarget } from './kpi-target/entities/kpi-target.entity';

const TASK_DUE_SOON_HOURS = 24;

export type KpiActualMetrics = {
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
  earlyTasks: number;
};

export type KpiAchievement = {
  score?: number;
  onTimeRate?: number;
  pointCompletionRate?: number;
  otHours?: number;
  completedTasks?: number;
};

export type KpiAchievementAdjustment = {
  completedTasksFactor?: number;
  adjustedByCompletedTasksTarget: boolean;
};

type DateWindow = {
  dateFrom?: Date;
  dateTo?: Date;
  now?: Date;
};

@Injectable()
export class KpiActualService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(StatusTask)
    private readonly statusTaskRepo: Repository<StatusTask>,
    private readonly workingTimeService: WorkingTimeService,
    private readonly kpiSettingsResolver: KpiSettingsResolver,
  ) {}

  async computeProjectMembersActual(
    projectId: string,
    orgId: string,
    userIds: string[],
    window: DateWindow,
  ): Promise<Map<string, KpiActualMetrics>> {
    if (!userIds.length) return new Map<string, KpiActualMetrics>();

    const now = window.now ?? new Date();
    const hasWindow = !!window.dateFrom && !!window.dateTo;
    const dateFrom = window.dateFrom;
    const dateTo = window.dateTo;
    const memberRows = await this.projectMemberRepo.find({
      where: { projectId, organizationId: orgId, userId: In(userIds) },
    });
    const memberMap = new Map(memberRows.map((row) => [row.userId, row]));

    const doneIds = await this.getDoneStatusIds(projectId, orgId);
    const dueSoonContext = this.getDueSoonContext(now, dateFrom, dateTo);
    const bonusRules = await this.kpiSettingsResolver.resolveBonusRules(
      projectId,
      orgId,
    );
    const weights = await this.kpiSettingsResolver.resolveWeights(
      projectId,
      orgId,
    );

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        Task,
        'child',
        'child.parent_task_id = task.id AND child.organization_id = task.organization_id AND child.deleted_at IS NULL',
      )
      .select('task.assigned_to', 'userId')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.assigned_to IN (:...userIds)', { userIds })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('child.id IS NULL')
      .groupBy('task.assigned_to');

    this.applySelects(
      qb,
      doneIds,
      hasWindow,
      dateFrom,
      dateTo,
      now,
      dueSoonContext,
      bonusRules.bonusEarlyTaskHours,
    );

    const statsRows = await qb.getRawMany<Record<string, string>>();
    return this.buildMetricsMap(userIds, statsRows, async (userId) => {
      const member = memberMap.get(userId);
      const [otData, expectedWorkingHours] = await Promise.all([
        this.workingTimeService.calcMemberOtHours(
          userId,
          orgId,
          dateFrom,
          dateTo,
          projectId,
        ),
        dateFrom && dateTo
          ? this.workingTimeService.calcExpectedWorkingHours(
              orgId,
              dateFrom,
              dateTo,
              member?.allocatedHoursPerDay != null
                ? Number(member.allocatedHoursPerDay)
                : null,
            )
          : Promise.resolve(undefined),
      ]);

      return {
        allocatedHoursPerDay:
          member?.allocatedHoursPerDay != null
            ? Number(member.allocatedHoursPerDay)
            : undefined,
        expectedWorkingHours,
        otData,
        weights,
        bonusRules,
      };
    });
  }

  async computeOrgMembersActual(
    orgId: string,
    userIds: string[],
    window: DateWindow,
  ): Promise<
    Map<
      string,
      KpiActualMetrics & {
        projectCount: number;
        activeProjectCount: number;
      }
    >
  > {
    if (!userIds.length) return new Map();

    const now = window.now ?? new Date();
    const hasWindow = !!window.dateFrom && !!window.dateTo;
    const dateFrom = window.dateFrom;
    const dateTo = window.dateTo;
    const bonusRules = await this.kpiSettingsResolver.resolveBonusRules(
      null,
      orgId,
    );
    const weights = await this.kpiSettingsResolver.resolveWeights(null, orgId);
    const dueSoonContext = this.getDueSoonContext(now, dateFrom, dateTo);

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        Task,
        'child',
        'child.parent_task_id = task.id AND child.organization_id = task.organization_id AND child.deleted_at IS NULL',
      )
      .leftJoin(
        StatusTask,
        'st',
        'st.id = task.status_id AND st.project_id = task.project_id AND st.deleted_at IS NULL',
      )
      .select('task.assigned_to', 'userId')
      .addSelect('COUNT(DISTINCT task.project_id)', 'projectCount')
      .where('task.organization_id = :orgId', { orgId })
      .andWhere('task.assigned_to IN (:...userIds)', { userIds })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('child.id IS NULL')
      .groupBy('task.assigned_to');

    this.applySelects(
      qb,
      null,
      hasWindow,
      dateFrom,
      dateTo,
      now,
      dueSoonContext,
      bonusRules.bonusEarlyTaskHours,
      true,
    );

    const statsRows = await qb.getRawMany<Record<string, string>>();
    const baseMap = await this.buildMetricsMap(
      userIds,
      statsRows,
      async (userId) => {
        const [otData, expectedWorkingHours] = await Promise.all([
          this.workingTimeService.calcMemberOtHours(
            userId,
            orgId,
            dateFrom,
            dateTo,
          ),
          dateFrom && dateTo
            ? this.workingTimeService.calcExpectedWorkingHours(
                orgId,
                dateFrom,
                dateTo,
              )
            : Promise.resolve(undefined),
        ]);

        return {
          expectedWorkingHours,
          otData,
          weights,
          bonusRules,
        };
      },
    );

    const result = new Map<
      string,
      KpiActualMetrics & { projectCount: number; activeProjectCount: number }
    >();
    for (const userId of userIds) {
      const base = baseMap.get(userId) ?? this.emptyMetrics();
      const row = statsRows.find((item) => item.userId === userId);
      const projectCount = Number(row?.projectCount) || 0;
      result.set(userId, {
        ...base,
        projectCount,
        activeProjectCount: projectCount,
      });
    }
    return result;
  }

  buildAchievement(
    target: Pick<
      KpiTarget,
      | 'targetScore'
      | 'targetOnTimeRate'
      | 'targetPointCompletionRate'
      | 'targetOtHours'
      | 'targetCompletedTasks'
    > | null,
    actual: Pick<
      KpiActualMetrics,
      | 'performanceScore'
      | 'onTimeRate'
      | 'pointCompletionRate'
      | 'effectiveOtHours'
      | 'completedTasks'
    >,
  ): {
    achievement: KpiAchievement;
    achievementRate?: number;
    adjustment: KpiAchievementAdjustment;
  } {
    const achievement: KpiAchievement = {};
    const completedTasksFactor =
      target?.targetCompletedTasks != null && target.targetCompletedTasks > 0
        ? actual.completedTasks / target.targetCompletedTasks
        : undefined;
    const targetAdjustmentFactor =
      completedTasksFactor != null ? Math.min(1, completedTasksFactor) : 1;

    if (target?.targetScore != null && +target.targetScore > 0) {
      achievement.score = Math.round(
        ((actual.performanceScore * targetAdjustmentFactor) /
          +target.targetScore) *
          100,
      );
    }
    if (target?.targetOnTimeRate != null && +target.targetOnTimeRate > 0) {
      achievement.onTimeRate = Math.round(
        ((actual.onTimeRate * targetAdjustmentFactor) /
          +target.targetOnTimeRate) *
          100,
      );
    }
    if (
      target?.targetPointCompletionRate != null &&
      +target.targetPointCompletionRate > 0
    ) {
      achievement.pointCompletionRate = Math.round(
        ((actual.pointCompletionRate * targetAdjustmentFactor) /
          +target.targetPointCompletionRate) *
          100,
      );
    }
    if (target?.targetOtHours != null && +target.targetOtHours > 0) {
      achievement.otHours = Math.round(
        (actual.effectiveOtHours / +target.targetOtHours) * 100,
      );
    }
    if (
      target?.targetCompletedTasks != null &&
      target.targetCompletedTasks > 0
    ) {
      achievement.completedTasks = Math.round(
        (actual.completedTasks / target.targetCompletedTasks) * 100,
      );
    }

    const targetMetricAchievementRate = this.averageDefinedAchievementValues(
      [
        achievement.score,
        achievement.pointCompletionRate,
        achievement.onTimeRate,
        achievement.completedTasks,
        achievement.otHours,
      ],
      { capAt100: true },
    );

    return {
      achievement,
      achievementRate: targetMetricAchievementRate ?? achievement.score,
      adjustment: {
        completedTasksFactor:
          completedTasksFactor != null
            ? Math.round(completedTasksFactor * 1000) / 1000
            : undefined,
        adjustedByCompletedTasksTarget: completedTasksFactor != null,
      },
    };
  }

  private averageDefinedAchievementValues(
    values: Array<number | undefined>,
    options?: { capAt100?: boolean },
  ): number | undefined {
    const defined = values.filter((value): value is number => value != null);
    if (!defined.length) return undefined;
    const valuesForAverage = options?.capAt100
      ? defined.map((value) => Math.min(100, value))
      : defined;
    return Math.round(
      valuesForAverage.reduce((sum, value) => sum + value, 0) /
        valuesForAverage.length,
    );
  }

  private applySelects(
    qb: any,
    doneIds: string[] | null,
    hasWindow: boolean,
    dateFrom: Date | undefined,
    dateTo: Date | undefined,
    now: Date,
    dueSoonContext: { enabled: boolean; dueSoonAt: Date; refNow?: Date },
    earlyHours: number,
    useStatusJoin = false,
  ) {
    const completedExpr = hasWindow
      ? `task.completed_at IS NOT NULL AND task.completed_at >= :dateFrom AND task.completed_at <= :dateTo`
      : useStatusJoin
        ? `LOWER(st.name) = 'done'`
        : `task.status_id = ANY(ARRAY[:...doneIds]::uuid[])`;
    const openByPeriodExpr = hasWindow
      ? `(task.completed_at IS NULL OR task.completed_at > :dateTo)`
      : useStatusJoin
        ? `(st.id IS NULL OR LOWER(st.name) != 'done')`
        : `task.status_id != ALL(ARRAY[:...doneIds]::uuid[])`;
    const membershipExpr = hasWindow
      ? `((${completedExpr}) OR (task.due_date IS NOT NULL AND task.due_date <= :dateTo AND ${openByPeriodExpr}))`
      : '1 = 1';
    const overdueExpr = hasWindow
      ? `task.due_date IS NOT NULL AND task.due_date < :dateTo AND ${openByPeriodExpr}`
      : `${openByPeriodExpr} AND task.due_date IS NOT NULL AND ${buildTaskDuePassedSql()}`;
    const dueSoonExpr = dueSoonContext.enabled
      ? `${openByPeriodExpr} AND task.due_date IS NOT NULL AND ${buildTaskDueSoonSql('task', ':refNow')}`
      : '1 = 0';

    qb.addSelect(
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
        `SUM(CASE WHEN ${completedExpr} AND task.due_date IS NOT NULL AND task.completed_at IS NOT NULL AND ${buildTaskDoneOnTimeSql()} THEN 1 ELSE 0 END)`,
        'onTimeTasks',
      )
      .addSelect(
        `SUM(CASE WHEN ${completedExpr} AND task.due_date IS NOT NULL AND task.completed_at IS NOT NULL AND ${buildTaskDoneLateSql()} THEN 1 ELSE 0 END)`,
        'lateTasks',
      )
      .addSelect(
        `SUM(CASE WHEN ${overdueExpr} THEN 1 ELSE 0 END)`,
        'overdueTasks',
      )
      .addSelect(
        `SUM(CASE WHEN ${dueSoonExpr} THEN 1 ELSE 0 END)`,
        'dueSoonTasks',
      )
      .addSelect(
        `SUM(CASE WHEN ${completedExpr} AND task.due_date IS NOT NULL AND task.completed_at IS NOT NULL AND task.completed_at <= (task.due_date - interval '${earlyHours} hours') THEN 1 ELSE 0 END)`,
        'earlyTasks',
      );

    if (!useStatusJoin && doneIds) {
      qb.setParameter(
        'doneIds',
        doneIds.length ? doneIds : ['00000000-0000-0000-0000-000000000000'],
      );
    }
    qb.setParameter('now', now);
    qb.setParameter('dueSoonAt', dueSoonContext.dueSoonAt);
    if (dueSoonContext.refNow) {
      qb.setParameter('refNow', dueSoonContext.refNow);
    }
    if (dateFrom) qb.setParameter('dateFrom', dateFrom);
    if (dateTo) qb.setParameter('dateTo', dateTo);
  }

  private async buildMetricsMap(
    userIds: string[],
    statsRows: Record<string, string>[],
    extraLoader: (userId: string) => Promise<{
      allocatedHoursPerDay?: number;
      expectedWorkingHours?: number;
      otData: {
        totalOtHours: number;
        effectiveOtHours: number;
        approvedOtTickets: number;
      };
      weights: {
        weightPointCompletion: number;
        weightOnTime: number;
        weightOtContribution: number;
      };
      bonusRules: {
        bonusEnabled: boolean;
        bonusOnTimeTask: number;
        bonusEarlyTaskHours: number;
        bonusEarlyTask: number;
        bonusZeroOverdue: number;
        bonusMaxCap: number;
        bonusOtPerEffectiveHour: number;
      };
    }>,
  ): Promise<Map<string, KpiActualMetrics>> {
    const result = new Map<string, KpiActualMetrics>();

    for (const userId of userIds) {
      const row = statsRows.find((item) => item.userId === userId);
      const extra = await extraLoader(userId);
      const raw = {
        totalAssigned: Number(row?.totalAssigned) || 0,
        completedTasks: Number(row?.completedTasks) || 0,
        onTimeTasks: Number(row?.onTimeTasks) || 0,
        overdueTasks: Number(row?.overdueTasks) || 0,
        totalEstimatePoints: Number(row?.totalEstimatePoints) || 0,
        totalActualPoints: Number(row?.totalActualPoints) || 0,
      };
      const rates = calcRates(raw);
      const otScore = calcOtContributionScore(
        extra.otData.effectiveOtHours,
        extra.expectedWorkingHours ?? 0,
      );
      const baseScore = calcBasePerformanceScore(
        rates.pointCompletionRate,
        rates.onTimeRate,
        otScore,
        extra.weights,
      );
      const bonusPoints = calcBonusPoints(
        {
          onTimeTasks: raw.onTimeTasks,
          earlyTasks: Number(row?.earlyTasks) || 0,
          hasZeroOverdue: raw.overdueTasks === 0,
          effectiveOtHours: extra.otData.effectiveOtHours,
        },
        extra.bonusRules,
      );
      const performanceScore = calcFinalScore(baseScore, bonusPoints);

      result.set(userId, {
        totalAssigned: raw.totalAssigned,
        completedTasks: raw.completedTasks,
        openTasks: raw.totalAssigned - raw.completedTasks,
        onTimeTasks: raw.onTimeTasks,
        lateTasks: Number(row?.lateTasks) || 0,
        overdueTasks: raw.overdueTasks,
        dueSoonTasks: Number(row?.dueSoonTasks) || 0,
        totalEstimatePoints: raw.totalEstimatePoints,
        totalActualPoints: raw.totalActualPoints,
        openPoints: raw.totalEstimatePoints - raw.totalActualPoints,
        pointCompletionRate: rates.pointCompletionRate,
        totalEstimatedHours: row?.totalEstimatedHours
          ? Number(row.totalEstimatedHours)
          : undefined,
        completedEstimatedHours: row?.completedEstimatedHours
          ? Number(row.completedEstimatedHours)
          : undefined,
        allocatedHoursPerDay: extra.allocatedHoursPerDay,
        expectedWorkingHours: extra.expectedWorkingHours,
        approvedOtTickets: extra.otData.approvedOtTickets,
        totalOtHours: extra.otData.totalOtHours,
        effectiveOtHours: extra.otData.effectiveOtHours,
        completionRate: rates.completionRate,
        onTimeRate: rates.onTimeRate,
        overdueRate: rates.overdueRate,
        performanceScore,
        earlyTasks: Number(row?.earlyTasks) || 0,
      });
    }

    return result;
  }

  private getDueSoonContext(
    now: Date,
    dateFrom?: Date,
    dateTo?: Date,
  ): { enabled: boolean; dueSoonAt: Date; refNow?: Date } {
    const dueSoonAt = new Date(
      now.getTime() + TASK_DUE_SOON_HOURS * 3600 * 1000,
    );
    if (!dateFrom || !dateTo) {
      return { enabled: true, dueSoonAt, refNow: now };
    }

    const inWindow = now >= dateFrom && now <= dateTo;
    return {
      enabled: inWindow,
      dueSoonAt,
      refNow: inWindow ? now : undefined,
    };
  }

  private async getDoneStatusIds(
    projectId: string,
    orgId: string,
  ): Promise<string[]> {
    const rows = await this.statusTaskRepo.find({
      where: { projectId, organizationId: orgId },
    });
    return rows
      .filter((s) => s.name?.toLowerCase() === 'done' && !s.deletedAt)
      .map((s) => s.id);
  }

  private emptyMetrics(): KpiActualMetrics {
    return {
      totalAssigned: 0,
      completedTasks: 0,
      openTasks: 0,
      onTimeTasks: 0,
      lateTasks: 0,
      overdueTasks: 0,
      dueSoonTasks: 0,
      totalEstimatePoints: 0,
      totalActualPoints: 0,
      openPoints: 0,
      pointCompletionRate: 0,
      approvedOtTickets: 0,
      totalOtHours: 0,
      effectiveOtHours: 0,
      completionRate: 0,
      onTimeRate: 0,
      overdueRate: 0,
      performanceScore: 0,
      earlyTasks: 0,
    };
  }
}
