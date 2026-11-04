import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../task-management/entities/task.entity';
import { StatusTask } from '../status-task/entities/status-task.entity';
import { ProjectMember } from '../core/entities/project-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { UserRole, ScopeType } from '@modules/rbac/entities/user-role.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { ProjectCoreService } from '../core/project-core.service';
import { TaskDueState } from '../task-management/dto/response/task.response';
import {
  buildTaskDueSoonSql,
  isTaskCompletedOnTime,
  isTaskDuePassed,
  resolveTaskDueCutoff,
} from '../task-management/utils/task-due-date.helper';
import {
  ProjectDashboardResponse,
  DashboardCardsResponse,
  TaskByStatusResponse,
  ActiveTaskResponse,
  TaskByPriorityResponse,
  TaskByTypeResponse,
  WorkloadResponse,
  WorkloadMemberResponse,
  WorkloadMemberStatusResponse,
  MemberStatsResponse,
  MemberRoleStatResponse,
} from './dto/response/project-dashboard.response';

const TASK_DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ProjectDashboardService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,

    @InjectRepository(StatusTask)
    private readonly statusTaskRepo: Repository<StatusTask>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    private readonly projectCoreService: ProjectCoreService,
  ) {}

  async getDashboard(
    projectId: string,
    orgId: string,
    userId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ProjectDashboardResponse> {
    await this.projectCoreService.getProjectEntity(projectId, orgId);
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });

    const [
      cards,
      tasksByStatus,
      activeTasks,
      tasksByPriority,
      tasksByType,
      workload,
      memberStats,
    ] = await Promise.all([
      this.getCards(projectId, orgId),
      this.getTasksByStatus(projectId, orgId, dateFrom, dateTo),
      this.getActiveTasks(projectId, orgId),
      this.getTasksByPriority(projectId, orgId, dateFrom, dateTo),
      this.getTasksByType(projectId, orgId, dateFrom, dateTo),
      this.getWorkload(projectId, orgId),
      this.getMemberStats(projectId, orgId),
    ]);

    return {
      cards,
      tasksByStatus,
      activeTasks,
      tasksByPriority,
      tasksByType,
      workload,
      memberStats,
    };
  }

  // ─── 4 Summary Cards (always last 7 days) ───────────────────────────────────

  private async getCards(
    projectId: string,
    orgId: string,
  ): Promise<DashboardCardsResponse> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dueSoonAt = new Date(now.getTime() + TASK_DUE_SOON_WINDOW_MS);

    const base = this.taskRepo
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL');

    const [
      completedLast7Days,
      updatedLast7Days,
      createdLast7Days,
      dueSoonCount,
    ] = await Promise.all([
      base
        .clone()
        .andWhere('task.completed_at >= :since', { since: sevenDaysAgo })
        .getCount(),
      base
        .clone()
        .andWhere('task.updated_at >= :since', { since: sevenDaysAgo })
        .andWhere('task.completed_at IS NULL')
        .getCount(),
      base
        .clone()
        .andWhere('task.created_at >= :since', { since: sevenDaysAgo })
        .getCount(),
      base
        .clone()
        .andWhere('task.completed_at IS NULL')
        .andWhere('task.due_date IS NOT NULL')
        .andWhere(buildTaskDueSoonSql(), { now, dueSoonAt })
        .getCount(),
    ]);

    return {
      completedLast7Days,
      updatedLast7Days,
      createdLast7Days,
      dueSoonCount,
    };
  }

  // ─── Pie Chart: Tasks by Status ─────────────────────────────────────────────

  private async getTasksByStatus(
    projectId: string,
    orgId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<TaskByStatusResponse[]> {
    // Get all statuses for the project
    const statuses = await this.statusTaskRepo.find({
      where: { projectId, organizationId: orgId },
      order: { orderIndex: 'ASC' },
    });

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .select('task.status_id', 'statusId')
      .addSelect('COUNT(task.id)', 'count')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL')
      .groupBy('task.status_id');

    if (dateFrom) {
      qb.andWhere('task.created_at >= :dateFrom', {
        dateFrom: new Date(dateFrom),
      });
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('task.created_at <= :dateTo', { dateTo: end });
    }

    const rows: { statusId: string | null; count: string }[] =
      await qb.getRawMany();
    const countByStatusId = new Map(
      rows.map((r) => [r.statusId ?? 'unset', Number(r.count)]),
    );

    const result: TaskByStatusResponse[] = statuses.map((s) => ({
      statusId: s.id,
      statusName: s.name,
      orderIndex: s.orderIndex,
      count: countByStatusId.get(s.id) ?? 0,
    }));

    // Include tasks with no status (if any)
    const unsetCount = countByStatusId.get('unset') ?? 0;
    if (unsetCount > 0) {
      result.push({
        statusId: '',
        statusName: 'No Status',
        orderIndex: 999,
        count: unsetCount,
      });
    }

    return result;
  }

  // ─── 5 Active Tasks ──────────────────────────────────────────────────────────

  private async getActiveTasks(
    projectId: string,
    orgId: string,
  ): Promise<ActiveTaskResponse[]> {
    const tasks = await this.taskRepo
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('task.completed_at IS NULL')
      .orderBy('task.updated_at', 'DESC')
      .limit(5)
      .getMany();

    if (tasks.length === 0) return [];

    // Fetch status names
    const statusIds = [
      ...new Set(tasks.map((t) => t.statusId).filter(Boolean)),
    ] as string[];
    const statuses = statusIds.length
      ? await this.statusTaskRepo
          .createQueryBuilder('s')
          .where('s.id IN (:...ids)', { ids: statusIds })
          .getMany()
      : [];
    const statusNameById = new Map(statuses.map((s) => [s.id, s.name]));

    // Fetch assignee names
    const assigneeIds = [
      ...new Set(tasks.map((t) => t.assignedTo).filter(Boolean)),
    ] as string[];
    const users = assigneeIds.length
      ? await this.userRepo
          .createQueryBuilder('u')
          .where('u.id IN (:...ids)', { ids: assigneeIds })
          .getMany()
      : [];
    const userNameById = new Map(
      users.map((u) => [
        u.id,
        `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u.id,
      ]),
    );

    const now = Date.now();
    const dueSoonAt = now + TASK_DUE_SOON_WINDOW_MS;

    return tasks.map((task) => {
      const statusName = task.statusId
        ? statusNameById.get(task.statusId)
        : undefined;
      const dueState = this.resolveTaskDueState(
        task,
        statusName,
        now,
        dueSoonAt,
      );

      return {
        id: task.id,
        title: task.title,
        slug: task.slug,
        priority: task.priority,
        statusId: task.statusId,
        statusName,
        assignedTo: task.assignedTo,
        assigneeName: task.assignedTo
          ? userNameById.get(task.assignedTo)
          : undefined,
        dueDate: task.dueDate,
        dueState,
        updatedAt: task.updatedAt,
      };
    });
  }

  // ─── Bar Chart: Tasks by Priority ───────────────────────────────────────────

  private async getTasksByPriority(
    projectId: string,
    orgId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<TaskByPriorityResponse[]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .select('task.priority', 'priority')
      .addSelect('COUNT(task.id)', 'count')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL')
      .groupBy('task.priority');

    if (dateFrom) {
      qb.andWhere('task.created_at >= :dateFrom', {
        dateFrom: new Date(dateFrom),
      });
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('task.created_at <= :dateTo', { dateTo: end });
    }

    const rows: { priority: string; count: string }[] = await qb.getRawMany();
    const priorityOrder = ['urgent', 'high', 'medium', 'low'];
    const countByPriority = new Map(
      rows.map((r) => [r.priority, Number(r.count)]),
    );

    return priorityOrder.map((p) => ({
      priority: p,
      count: countByPriority.get(p) ?? 0,
    }));
  }

  // ─── Type of Work: task vs subtask ──────────────────────────────────────────

  private async getTasksByType(
    projectId: string,
    orgId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<TaskByTypeResponse[]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .select(
        'CASE WHEN task.parent_task_id IS NULL THEN :typeTask ELSE :typeSubtask END',
        'type',
      )
      .addSelect('COUNT(task.id)', 'count')
      .setParameters({ typeTask: 'task', typeSubtask: 'subtask' })
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL')
      .groupBy(
        'CASE WHEN task.parent_task_id IS NULL THEN :typeTask ELSE :typeSubtask END',
      );

    if (dateFrom) {
      qb.andWhere('task.created_at >= :dateFrom', {
        dateFrom: new Date(dateFrom),
      });
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('task.created_at <= :dateTo', { dateTo: end });
    }

    const rows: { type: string; count: string }[] = await qb.getRawMany();
    const countByType = new Map(rows.map((r) => [r.type, Number(r.count)]));

    return [
      { type: 'task', count: countByType.get('task') ?? 0 },
      { type: 'subtask', count: countByType.get('subtask') ?? 0 },
    ];
  }

  // ─── Team Workload ───────────────────────────────────────────────────────────

  private async getWorkload(
    projectId: string,
    orgId: string,
  ): Promise<WorkloadResponse> {
    // Active project members
    const members = await this.projectMemberRepo.find({
      where: { projectId, organizationId: orgId, isActive: true },
    });

    // Statuses for the project
    const statuses = await this.statusTaskRepo.find({
      where: { projectId, organizationId: orgId },
      order: { orderIndex: 'ASC' },
    });
    const statusNameById = new Map(statuses.map((s) => [s.id, s.name]));

    // All active tasks with assignedTo
    const tasks = await this.taskRepo
      .createQueryBuilder('task')
      .select(['task.id', 'task.assigned_to', 'task.status_id'])
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL')
      .getRawMany<{
        task_id: string;
        task_assigned_to: string | null;
        task_status_id: string | null;
      }>();

    // Unassigned count
    const unassignedCount = tasks.filter((t) => !t.task_assigned_to).length;

    // User info
    const userIds = members.map((m) => m.userId);
    const users = userIds.length
      ? await this.userRepo
          .createQueryBuilder('u')
          .where('u.id IN (:...ids)', { ids: userIds })
          .getMany()
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    // Group tasks per member per status
    const tasksByMember = new Map<string, Map<string, number>>();
    for (const task of tasks) {
      if (!task.task_assigned_to) continue;
      if (!tasksByMember.has(task.task_assigned_to)) {
        tasksByMember.set(task.task_assigned_to, new Map());
      }
      const statusKey = task.task_status_id ?? 'unset';
      const memberMap = tasksByMember.get(task.task_assigned_to)!;
      memberMap.set(statusKey, (memberMap.get(statusKey) ?? 0) + 1);
    }

    const membersResult: WorkloadMemberResponse[] = members.map((m) => {
      const user = userById.get(m.userId);
      const statusMap =
        tasksByMember.get(m.userId) ?? new Map<string, number>();

      const tasksByStatus: WorkloadMemberStatusResponse[] = statuses.map(
        (s) => ({
          statusId: s.id,
          statusName: s.name,
          count: statusMap.get(s.id) ?? 0,
        }),
      );

      const unsetCount = statusMap.get('unset') ?? 0;
      if (unsetCount > 0) {
        tasksByStatus.push({
          statusId: '',
          statusName: 'No Status',
          count: unsetCount,
        });
      }

      const totalTasks = [...statusMap.values()].reduce((a, b) => a + b, 0);

      return {
        userId: m.userId,
        fullName: user
          ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
            user.email
          : undefined,
        email: user?.email,
        avatar: user?.avatarUrl,
        totalTasks,
        tasksByStatus,
      };
    });

    return { unassignedCount, members: membersResult };
  }

  // ─── Member Stats ─────────────────────────────────────────────────────────

  private async getMemberStats(
    projectId: string,
    orgId: string,
  ): Promise<MemberStatsResponse> {
    const total = await this.projectMemberRepo.count({
      where: { projectId, organizationId: orgId, isActive: true },
    });

    // UserRole rows scoped to this project
    const userRoles = await this.userRoleRepo
      .createQueryBuilder('ur')
      .where('ur.scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .getMany();

    if (userRoles.length === 0) {
      return { total, byRole: [] };
    }

    const roleIds = [...new Set(userRoles.map((ur) => ur.roleId))];
    const roles = await this.roleRepo
      .createQueryBuilder('r')
      .where('r.id IN (:...roleIds)', { roleIds })
      .andWhere('r.deleted_at IS NULL')
      .getMany();
    const roleNameById = new Map(roles.map((r) => [r.id, r.name]));

    const countByRole = new Map<string, number>();
    for (const ur of userRoles) {
      countByRole.set(ur.roleId, (countByRole.get(ur.roleId) ?? 0) + 1);
    }

    const byRole: MemberRoleStatResponse[] = [...countByRole.entries()].map(
      ([roleId, count]) => ({
        roleId,
        roleName: roleNameById.get(roleId) ?? roleId,
        count,
      }),
    );

    return { total, byRole };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private resolveTaskDueState(
    task: Task,
    statusName: string | undefined,
    now: number,
    dueSoonAt: number,
  ): string {
    if (!task.dueDate) return TaskDueState.NO_DUE_DATE;

    const isDone =
      statusName !== undefined &&
      statusName.trim().toLowerCase().replace(/\s+/g, '_') === 'done';

    const dueDate = new Date(task.dueDate);

    if (isDone) {
      const completedAt = task.completedAt
        ? new Date(task.completedAt).getTime()
        : null;
      if (completedAt && !isTaskCompletedOnTime(new Date(completedAt), dueDate))
        return TaskDueState.DONE_LATE;
      return TaskDueState.DONE_ON_TIME;
    }

    if (isTaskDuePassed(dueDate, now)) return TaskDueState.OVERDUE;
    if (resolveTaskDueCutoff(dueDate).getTime() <= dueSoonAt)
      return TaskDueState.DUE_SOON;
    return TaskDueState.ON_TRACK;
  }
}
