import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Project } from '@modules/project/core/entities/project.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Task } from '@modules/project/task-management/entities/task.entity';
import { StatusTask } from '@modules/project/status-task/entities/status-task.entity';
import {
  buildTaskDoneOnTimeSql,
  buildTaskDuePassedSql,
  buildTaskDueSoonSql,
  isTaskCompletedOnTime,
  isTaskDuePassed,
} from '@modules/project/task-management/utils/task-due-date.helper';
import { User } from '@modules/users/entities/user.entity';
import { KpiSettingsResolver } from '@modules/analytics/kpi-settings-resolver.service';
import { KpiActualService } from '@modules/analytics/kpi-actual.service';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';
import { RolePermission } from '@modules/rbac/entities/role-permission.entity';
import { Permission } from '@modules/rbac/entities/permissions.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { ProjectKpiMembersQueryRequest } from './dto/request/project-kpi-query.request';
import { ProjectKpiSelfQueryRequest } from './dto/request/project-kpi-self-query.request';
import { ProjectKpiOverviewResponse } from './dto/response/project-kpi-overview.response';
import { ProjectMemberKpiResponse } from './dto/response/project-member-kpi.response';
import { ProjectMemberKpiDetailResponse } from './dto/response/project-member-kpi-detail.response';

const TASK_DUE_SOON_HOURS = 24;
const PROJECT_MANAGER_ROLE_NAME = 'project_manager';
const PROJECT_OWNER_ROLE_NAME = 'project_owner';

@Injectable()
export class ProjectKpiService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,

    @InjectRepository(StatusTask)
    private readonly statusTaskRepo: Repository<StatusTask>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,

    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,

    private readonly kpiActualService: KpiActualService,
    private readonly kpiSettingsResolver: KpiSettingsResolver,
  ) {}

  async getProjectOverview(
    projectId: string,
    orgId: string,
    currentUserId: string,
  ): Promise<ProjectKpiOverviewResponse> {
    await this.assertCanViewAllProjectKpi(projectId, orgId, currentUserId);

    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const doneIds = await this.getDoneStatusIds(projectId, orgId);
    const now = new Date();
    const dueSoonAt = new Date(
      now.getTime() + TASK_DUE_SOON_HOURS * 3600 * 1000,
    );

    const overviewRaw = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        Task,
        'child',
        'child.parent_task_id = task.id AND child.organization_id = task.organization_id AND child.deleted_at IS NULL',
      )
      .select([
        'COUNT(task.id) AS "totalTasks"',
        'SUM(COALESCE(task.estimated_point, 1)) AS "projectTotalEstimatePoints"',
        'SUM(task.estimated_hours) AS "totalEstimatedHours"',
        `SUM(CASE WHEN task.status_id = ANY(ARRAY[:...doneIds]::uuid[]) THEN 1 ELSE 0 END) AS "completedTasks"`,
        `SUM(CASE WHEN task.status_id = ANY(ARRAY[:...doneIds]::uuid[]) THEN COALESCE(task.estimated_point, 1) ELSE 0 END) AS "projectTotalActualPoints"`,
        `SUM(CASE WHEN task.status_id = ANY(ARRAY[:...doneIds]::uuid[]) THEN COALESCE(task.estimated_hours, 0) ELSE 0 END) AS "completedEstimatedHours"`,
        `SUM(CASE WHEN task.status_id != ALL(ARRAY[:...doneIds]::uuid[]) AND task.due_date IS NOT NULL AND ${buildTaskDuePassedSql()} THEN 1 ELSE 0 END) AS "overdueTasks"`,
        `SUM(CASE WHEN task.status_id != ALL(ARRAY[:...doneIds]::uuid[]) AND task.due_date IS NOT NULL AND ${buildTaskDueSoonSql()} THEN 1 ELSE 0 END) AS "dueSoonTasks"`,
        `SUM(CASE WHEN task.status_id = ANY(ARRAY[:...doneIds]::uuid[]) AND task.completed_at IS NOT NULL AND task.due_date IS NOT NULL AND ${buildTaskDoneOnTimeSql()} THEN 1 ELSE 0 END) AS "doneOnTimeTasks"`,
      ])
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('child.id IS NULL')
      .setParameter(
        'doneIds',
        doneIds.length ? doneIds : ['00000000-0000-0000-0000-000000000000'],
      )
      .setParameter('now', now)
      .setParameter('dueSoonAt', dueSoonAt)
      .getRawOne();

    const totalEstimate = Number(overviewRaw?.projectTotalEstimatePoints) || 0;
    const totalActual = Number(overviewRaw?.projectTotalActualPoints) || 0;
    const totalTasks = Number(overviewRaw?.totalTasks) || 0;
    const completedTasks = Number(overviewRaw?.completedTasks) || 0;
    const doneOnTimeTasks = Number(overviewRaw?.doneOnTimeTasks) || 0;
    const overdueTasks = Number(overviewRaw?.overdueTasks) || 0;

    const completionRate = totalTasks
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;
    const onTimeRate = completedTasks
      ? Math.round((doneOnTimeTasks / completedTasks) * 100)
      : 0;
    const overdueRate = totalTasks
      ? Math.round((overdueTasks / totalTasks) * 100)
      : 0;
    const pointBasedProgress = totalEstimate
      ? Math.min(100, Math.round((totalActual / totalEstimate) * 100))
      : 0;
    const pointCompletionRate = totalEstimate
      ? Math.round((totalActual / totalEstimate) * 100)
      : 0;

    const [totalMembers, activeMembers] = await Promise.all([
      this.projectMemberRepo.count({
        where: { projectId, organizationId: orgId },
      }),
      this.projectMemberRepo.count({
        where: { projectId, organizationId: orgId, isActive: true },
      }),
    ]);

    let daysRemaining: number | undefined;
    if (project.endDate) {
      const diff = new Date(project.endDate).getTime() - now.getTime();
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return {
      projectId,
      projectName: project.name,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate,
      endDate: project.endDate,
      daysRemaining,
      progress: project.progress ?? 0,
      isPointComplete: pointBasedProgress >= 100,
      totalTasks,
      completedTasks,
      overdueTasks,
      dueSoonTasks: Number(overviewRaw?.dueSoonTasks) || 0,
      projectTotalEstimatePoints: totalEstimate,
      projectTotalActualPoints: totalActual,
      projectOpenPoints: totalEstimate - totalActual,
      pointBasedProgress,
      totalEstimatedHours: overviewRaw?.totalEstimatedHours
        ? Number(overviewRaw.totalEstimatedHours)
        : undefined,
      completedEstimatedHours: overviewRaw?.completedEstimatedHours
        ? Number(overviewRaw.completedEstimatedHours)
        : undefined,
      completionRate,
      pointCompletionRate,
      onTimeRate,
      overdueRate,
      totalMembers,
      activeMembers,
    };
  }

  async getProjectMembersKpi(
    projectId: string,
    orgId: string,
    currentUserId: string,
    query: ProjectKpiMembersQueryRequest,
  ): Promise<ProjectMemberKpiResponse[]> {
    await this.assertCanViewAllProjectKpi(projectId, orgId, currentUserId);
    return this.buildProjectMembersKpi(projectId, orgId, query);
  }

  private async buildProjectMembersKpi(
    projectId: string,
    orgId: string,
    query: ProjectKpiMembersQueryRequest,
  ): Promise<ProjectMemberKpiResponse[]> {
    const members = await this.projectMemberRepo.find({
      where: {
        projectId,
        organizationId: orgId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    const memberIds = members.map((m) => m.userId);
    if (!memberIds.length) return [];

    const targetIds = query.userId ? [query.userId] : memberIds;
    const now = new Date();
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;
    const actualMap = await this.kpiActualService.computeProjectMembersActual(
      projectId,
      orgId,
      targetIds,
      {
        dateFrom,
        dateTo,
        now,
      },
    );

    const users = await this.userRepo.findByIds(targetIds);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const memberMap = new Map(members.map((m) => [m.userId, m]));

    const results: ProjectMemberKpiResponse[] = [];
    for (const userId of targetIds) {
      const user = userMap.get(userId);
      const member = memberMap.get(userId);
      const actual = actualMap.get(userId);
      if (!actual) continue;

      const targetRow = await this.kpiSettingsResolver.resolveUserTarget(
        userId,
        projectId,
        orgId,
        dateTo ?? now,
      );

      let target: NonNullable<ProjectMemberKpiResponse['target']> | undefined;
      let achievementRate: number | undefined;
      let achievement: ProjectMemberKpiResponse['achievement'] | undefined;
      let achievementAdjustment:
        | ProjectMemberKpiResponse['achievementAdjustment']
        | undefined;
      if (targetRow) {
        target = {
          id: targetRow.id,
          period: targetRow.period,
          periodStart: (targetRow.periodStart as any).toString().slice(0, 10),
          periodEnd: (targetRow.periodEnd as any).toString().slice(0, 10),
          targetScore:
            targetRow.targetScore != null ? +targetRow.targetScore : undefined,
          targetPointCompletionRate:
            targetRow.targetPointCompletionRate != null
              ? +targetRow.targetPointCompletionRate
              : undefined,
          targetOnTimeRate:
            targetRow.targetOnTimeRate != null
              ? +targetRow.targetOnTimeRate
              : undefined,
          targetOtHours:
            targetRow.targetOtHours != null
              ? +targetRow.targetOtHours
              : undefined,
          targetCompletedTasks: targetRow.targetCompletedTasks ?? undefined,
          maxOverdueTasks: targetRow.maxOverdueTasks ?? undefined,
          requireZeroOverdue: targetRow.requireZeroOverdue,
        };
        const achievementResult = this.kpiActualService.buildAchievement(
          targetRow,
          actual,
        );
        achievement = achievementResult.achievement;
        achievementRate = achievementResult.achievementRate;
        achievementAdjustment = achievementResult.adjustment;
      }

      results.push({
        userId,
        fullName: user
          ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
          : undefined,
        email: user?.email,
        avatar: user?.avatarUrl,
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
        completedEstimatedHours: actual.completedEstimatedHours,
        allocatedHoursPerDay:
          member?.allocatedHoursPerDay != null
            ? Number(member.allocatedHoursPerDay)
            : actual.allocatedHoursPerDay,
        expectedWorkingHours: actual.expectedWorkingHours,
        approvedOtTickets: actual.approvedOtTickets,
        totalOtHours: actual.totalOtHours,
        effectiveOtHours: actual.effectiveOtHours,
        completionRate: actual.completionRate,
        onTimeRate: actual.onTimeRate,
        overdueRate: actual.overdueRate,
        performanceScore: actual.performanceScore,
        target,
        achievement,
        achievementAdjustment,
        achievementRate,
      });
    }

    // Sort
    const sortBy = query.sortBy ?? 'performanceScore';
    const sortOrder = query.sortOrder ?? 'DESC';
    results.sort((a, b) => {
      const va = (a as any)[sortBy] ?? 0;
      const vb = (b as any)[sortBy] ?? 0;
      return sortOrder === 'DESC' ? vb - va : va - vb;
    });

    return results;
  }

  async getMyProjectKpiDetail(
    projectId: string,
    orgId: string,
    currentUserId: string,
    query: ProjectKpiSelfQueryRequest,
  ): Promise<ProjectMemberKpiDetailResponse> {
    await this.assertActiveProjectMember(projectId, orgId, currentUserId);
    return this.buildProjectMemberKpiDetail(
      projectId,
      orgId,
      currentUserId,
      currentUserId,
      query,
    );
  }

  async getProjectMemberKpiDetail(
    projectId: string,
    orgId: string,
    currentUserId: string,
    targetUserId: string,
    query?: ProjectKpiSelfQueryRequest,
  ): Promise<ProjectMemberKpiDetailResponse> {
    if (currentUserId === targetUserId) {
      await this.assertActiveProjectMember(projectId, orgId, currentUserId);
    } else {
      await this.assertCanViewAllProjectKpi(projectId, orgId, currentUserId);
    }

    return this.buildProjectMemberKpiDetail(
      projectId,
      orgId,
      currentUserId,
      targetUserId,
      query,
    );
  }

  private async buildProjectMemberKpiDetail(
    projectId: string,
    orgId: string,
    currentUserId: string,
    targetUserId: string,
    query?: ProjectKpiSelfQueryRequest,
  ): Promise<ProjectMemberKpiDetailResponse> {
    const dateFrom = query?.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query?.dateTo ? new Date(query.dateTo) : undefined;
    const list = await this.buildProjectMembersKpi(projectId, orgId, {
      userId: targetUserId,
      dateFrom: query?.dateFrom,
      dateTo: query?.dateTo,
    } as ProjectKpiMembersQueryRequest);

    if (!list.length) {
      throw new NotFoundException('Member not found in project');
    }
    const base = list[0];

    // tasks by priority
    const priorityRows = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        Task,
        'child',
        'child.parent_task_id = task.id AND child.organization_id = task.organization_id AND child.deleted_at IS NULL',
      )
      .select([
        'task.priority AS priority',
        'COUNT(task.id) AS cnt',
        'SUM(COALESCE(task.estimated_point, 1)) AS pts',
      ])
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.assigned_to = :targetUserId', { targetUserId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('child.id IS NULL')
      .andWhere(this.buildTaskWindowCondition(dateFrom, dateTo), {
        dateFrom,
        dateTo,
      })
      .groupBy('task.priority')
      .getRawMany();

    const tasksByPriority = { urgent: 0, high: 0, medium: 0, low: 0 };
    const pointsByPriority = { urgent: 0, high: 0, medium: 0, low: 0 };
    for (const row of priorityRows) {
      const p = row.priority as keyof typeof tasksByPriority;
      if (p in tasksByPriority) {
        tasksByPriority[p] = Number(row.cnt);
        pointsByPriority[p] = Number(row.pts);
      }
    }

    // recent tasks (max 5)
    const recentRaw = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        StatusTask,
        'st',
        'st.id = task.status_id AND st.deleted_at IS NULL',
      )
      .select([
        'task.id AS "taskId"',
        'task.title AS title',
        'task.slug AS slug',
        'st.name AS "statusName"',
        'task.priority AS priority',
        'task.estimated_point AS "estimatedPoint"',
        'task.estimated_hours AS "estimatedHours"',
        'task.due_date AS "dueDate"',
        'task.completed_at AS "completedAt"',
      ])
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.assigned_to = :targetUserId', { targetUserId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere(this.buildTaskWindowCondition(dateFrom, dateTo), {
        dateFrom,
        dateTo,
      })
      .orderBy('task.updated_at', 'DESC')
      .limit(5)
      .getRawMany();

    const now = new Date();
    const recentTasks = recentRaw.map((r) => {
      let dueState = 'no_due_date';
      if (r.dueDate) {
        if (r.completedAt) {
          dueState = isTaskCompletedOnTime(
            new Date(r.completedAt),
            new Date(r.dueDate),
          )
            ? 'on_time'
            : 'late';
        } else if (isTaskDuePassed(new Date(r.dueDate), now)) {
          dueState = 'overdue';
        } else {
          dueState = 'upcoming';
        }
      }
      return {
        taskId: r.taskId,
        title: r.title,
        slug: r.slug,
        statusName: r.statusName,
        priority: r.priority,
        estimatedPoint: r.estimatedPoint ? Number(r.estimatedPoint) : undefined,
        estimatedHours: r.estimatedHours ? Number(r.estimatedHours) : undefined,
        dueDate: r.dueDate,
        dueState,
        completedAt: r.completedAt,
      };
    });

    return { ...base, tasksByPriority, pointsByPriority, recentTasks };
  }

  private buildTaskWindowCondition(dateFrom?: Date, dateTo?: Date): string {
    if (!dateFrom || !dateTo) {
      return '1 = 1';
    }

    return `(
      (
        task.completed_at IS NOT NULL
        AND task.completed_at >= :dateFrom
        AND task.completed_at <= :dateTo
      )
      OR (
        task.due_date IS NOT NULL
        AND task.due_date <= :dateTo
        AND (task.completed_at IS NULL OR task.completed_at > :dateTo)
      )
    )`;
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

  private async assertCanViewAllProjectKpi(
    projectId: string,
    orgId: string,
    userId: string,
  ) {
    const project = await this.getProjectOrThrow(projectId, orgId);

    const isOrgAdmin = await this.hasOrgPermission(
      userId,
      orgId,
      PERMISSIONS.ANALYTICS.KPI.VIEW_ORG,
    );
    if (isOrgAdmin) return;

    const isManager = (project.managerId ?? []).includes(userId);
    if (isManager || project.createdBy === userId) return;

    const hasPrivilegedProjectRole = await this.hasProjectScopedRole(
      userId,
      orgId,
      projectId,
      [PROJECT_MANAGER_ROLE_NAME, PROJECT_OWNER_ROLE_NAME],
    );
    if (hasPrivilegedProjectRole) return;

    // fallback: check permission-based access
    const hasKpiPermission = await this.hasProjectPermission(
      userId,
      orgId,
      projectId,
      PERMISSIONS.ANALYTICS.KPI.VIEW_PROJECT,
    );
    if (hasKpiPermission) return;

    throw new ForbiddenException(
      'Only project managers or owners can view KPI',
    );
  }

  private async assertActiveProjectMember(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<ProjectMember> {
    await this.getProjectOrThrow(projectId, orgId);

    const member = await this.projectMemberRepo.findOne({
      where: {
        projectId,
        organizationId: orgId,
        userId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    if (!member) {
      throw new ForbiddenException(
        'You are not an active member of this project',
      );
    }

    return member;
  }

  private async getProjectOrThrow(
    projectId: string,
    orgId: string,
  ): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
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

  private async hasProjectPermission(
    userId: string,
    orgId: string,
    projectId: string,
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
      .andWhere(
        '(ur.scope_type = :org OR (ur.scope_type = :project AND ur.scope_id = :projectId))',
        { org: ScopeType.ORGANIZATION, project: ScopeType.PROJECT, projectId },
      )
      .andWhere('rp.permission_id = :permId', { permId: permission.id })
      .getOne();
    return !!row;
  }

  private async hasProjectScopedRole(
    userId: string,
    orgId: string,
    projectId: string,
    roleNames: string[],
  ): Promise<boolean> {
    const row = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scope', { scope: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .andWhere('r.name IN (:...roleNames)', { roleNames })
      .getOne();

    return !!row;
  }
}
