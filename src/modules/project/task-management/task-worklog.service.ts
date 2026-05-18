import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Task } from './entities/task.entity';
import { TaskWorklog, TaskWorklogSource } from './entities/task-worklog.entity';
import { ProjectMember } from '../core/entities/project-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { ProjectCoreService } from '../core/project-core.service';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { CreateTaskWorklogRequest } from './dto/request/create-task-worklog.request';
import { UpdateTaskWorklogRequest } from './dto/request/update-task-worklog.request';
import { QueryTaskWorklogsRequest } from './dto/request/query-task-worklogs.request';
import { TaskWorklogResponse } from './dto/response/task-worklog.response';

type NormalizedWorklogPayload = {
  workDate: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
  durationMinutes: number;
  description?: string | null;
  progressPercent?: number | null;
  isBlocker: boolean;
};

@Injectable()
export class TaskWorklogService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskWorklog)
    private readonly taskWorklogRepo: Repository<TaskWorklog>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly projectCoreService: ProjectCoreService,
  ) {}

  async createTaskWorklog(
    projectId: string,
    taskId: string,
    orgId: string,
    actorUserId: string,
    dto: CreateTaskWorklogRequest,
  ): Promise<TaskWorklogResponse> {
    await this.projectCoreService.ensureUserInProject(
      projectId,
      orgId,
      actorUserId,
      { allowOrgAdmin: true },
    );

    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanViewTask(task, actorUserId, orgId);

    const targetUserId = dto.userId ?? actorUserId;
    if (targetUserId !== actorUserId) {
      await this.projectCoreService.assertProjectPermission(
        actorUserId,
        orgId,
        projectId,
        PERMISSIONS.PROJECTS.TASKS.LOG_TIME,
      );
    }

    this.assertCanLogWorkOnTask(task, targetUserId);
    await this.ensureActiveProjectMember(projectId, orgId, targetUserId);
    const payload = this.normalizePayload(dto);

    const saved = await this.taskWorklogRepo.save(
      this.taskWorklogRepo.create({
        organizationId: orgId,
        projectId,
        taskId,
        userId: targetUserId,
        source: TaskWorklogSource.MANUAL,
        ...payload,
      }),
    );

    await this.syncTaskActualsCascade(taskId, projectId, orgId);
    return this.toResponse(saved, task);
  }

  async getTaskWorklogs(
    projectId: string,
    taskId: string,
    orgId: string,
    actorUserId: string,
    query: QueryTaskWorklogsRequest,
  ): Promise<TaskWorklogResponse[]> {
    await this.projectCoreService.ensureUserInProject(
      projectId,
      orgId,
      actorUserId,
      { allowOrgAdmin: true },
    );

    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanViewTask(task, actorUserId, orgId);

    if (query.userId && query.userId !== actorUserId) {
      const canViewOthers = await this.projectCoreService.hasProjectPermission(
        actorUserId,
        orgId,
        projectId,
        PERMISSIONS.PROJECTS.TASKS.LOG_TIME,
      );
      if (!canViewOthers) {
        throw new ForbiddenException(
          'You do not have permission to view another member worklogs',
        );
      }
    }

    const where: {
      projectId: string;
      taskId: string;
      organizationId: string;
      deletedAt: ReturnType<typeof IsNull>;
      workDate?: string;
      userId?: string;
    } = {
      projectId,
      taskId,
      organizationId: orgId,
      deletedAt: IsNull(),
    };

    if (query.workDate) {
      where.workDate = this.normalizeDate(query.workDate);
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    const worklogs = await this.taskWorklogRepo.find({
      where,
      order: { workDate: 'DESC', startedAt: 'DESC', createdAt: 'DESC' },
    });

    return this.toResponses(worklogs, task);
  }

  async updateTaskWorklog(
    projectId: string,
    taskId: string,
    worklogId: string,
    orgId: string,
    actorUserId: string,
    dto: UpdateTaskWorklogRequest,
  ): Promise<TaskWorklogResponse> {
    await this.projectCoreService.ensureUserInProject(
      projectId,
      orgId,
      actorUserId,
      { allowOrgAdmin: true },
    );

    const task = await this.getTaskEntity(taskId, projectId, orgId);
    const worklog = await this.getWorklogEntity(
      worklogId,
      taskId,
      projectId,
      orgId,
    );
    const canManageOthers = await this.projectCoreService.hasProjectPermission(
      actorUserId,
      orgId,
      projectId,
      PERMISSIONS.PROJECTS.TASKS.LOG_TIME,
    );

    if (worklog.userId !== actorUserId && !canManageOthers) {
      throw new ForbiddenException('You can only update your own worklog');
    }

    const nextUserId = dto.userId ?? worklog.userId;
    if (nextUserId !== worklog.userId && !canManageOthers) {
      throw new ForbiddenException(
        'You do not have permission to reassign worklog owner',
      );
    }

    this.assertCanLogWorkOnTask(task, nextUserId);
    await this.ensureActiveProjectMember(projectId, orgId, nextUserId);
    const payload = this.normalizePayload(dto, worklog);

    Object.assign(worklog, payload, { userId: nextUserId });
    const saved = await this.taskWorklogRepo.save(worklog);

    await this.syncTaskActualsCascade(taskId, projectId, orgId);
    return this.toResponse(saved, task);
  }

  async deleteTaskWorklog(
    projectId: string,
    taskId: string,
    worklogId: string,
    orgId: string,
    actorUserId: string,
  ): Promise<void> {
    await this.projectCoreService.ensureUserInProject(
      projectId,
      orgId,
      actorUserId,
      { allowOrgAdmin: true },
    );

    await this.getTaskEntity(taskId, projectId, orgId);
    const worklog = await this.getWorklogEntity(
      worklogId,
      taskId,
      projectId,
      orgId,
    );
    const canManageOthers = await this.projectCoreService.hasProjectPermission(
      actorUserId,
      orgId,
      projectId,
      PERMISSIONS.PROJECTS.TASKS.LOG_TIME,
    );

    if (worklog.userId !== actorUserId && !canManageOthers) {
      throw new ForbiddenException('You can only delete your own worklog');
    }

    await this.taskWorklogRepo.softDelete({ id: worklogId });
    await this.syncTaskActualsCascade(taskId, projectId, orgId);
  }

  private async getTaskEntity(
    taskId: string,
    projectId: string,
    orgId: string,
  ): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: {
        id: taskId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private async getWorklogEntity(
    worklogId: string,
    taskId: string,
    projectId: string,
    orgId: string,
  ): Promise<TaskWorklog> {
    const worklog = await this.taskWorklogRepo.findOne({
      where: {
        id: worklogId,
        taskId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
    });

    if (!worklog) {
      throw new NotFoundException('Task worklog not found');
    }

    return worklog;
  }

  private async ensureActiveProjectMember(
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.projectMemberRepo.findOne({
      where: {
        projectId,
        organizationId: orgId,
        userId,
        isActive: true,
        deletedAt: IsNull(),
      },
      select: { id: true },
    });

    if (!member) {
      throw new BadRequestException(
        'Worklog user must be an active member of the project',
      );
    }
  }

  private assertCanLogWorkOnTask(task: Task, userId: string): void {
    if (task.assignedTo === userId) {
      return;
    }

    throw new ForbiddenException(
      'Only the assigned member can log work on this task or subtask',
    );
  }

  private async ensureCanViewTask(
    task: Task,
    actorUserId: string,
    orgId: string,
  ): Promise<void> {
    if (task.assignedTo === actorUserId || task.createdBy === actorUserId) {
      return;
    }

    const canView = await this.projectCoreService.hasProjectPermission(
      actorUserId,
      orgId,
      task.projectId,
      PERMISSIONS.PROJECTS.TASKS.VIEW,
    );
    if (canView) {
      return;
    }

    const canLogTime = await this.projectCoreService.hasProjectPermission(
      actorUserId,
      orgId,
      task.projectId,
      PERMISSIONS.PROJECTS.TASKS.LOG_TIME,
    );
    if (canLogTime) {
      return;
    }

    throw new ForbiddenException(
      'You are not allowed to access this task worklog',
    );
  }

  private normalizePayload(
    input: Partial<CreateTaskWorklogRequest>,
    current?: TaskWorklog,
  ): NormalizedWorklogPayload {
    const workDate = this.normalizeDate(input.workDate ?? current?.workDate);
    const startedAt = this.toDateOrNull(
      input.startedAt,
      current?.startedAt ?? null,
    );
    const endedAt = this.toDateOrNull(input.endedAt, current?.endedAt ?? null);
    const durationMinutes = this.resolveDurationMinutes(
      input.durationMinutes ?? current?.durationMinutes,
      startedAt,
      endedAt,
    );

    return {
      workDate,
      startedAt,
      endedAt,
      durationMinutes,
      description: input.description ?? current?.description ?? null,
      progressPercent:
        input.progressPercent === undefined
          ? (current?.progressPercent ?? null)
          : (input.progressPercent ?? null),
      isBlocker: input.isBlocker ?? current?.isBlocker ?? false,
    };
  }

  private normalizeDate(value?: string): string {
    if (!value) {
      throw new BadRequestException('workDate is required');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('workDate must be in YYYY-MM-DD format');
    }

    return value;
  }

  private toDateOrNull(
    value?: Date | string | null,
    fallback?: Date | null,
  ): Date | null {
    if (value === undefined) {
      return fallback ?? null;
    }
    if (value === null || value === '') {
      return null;
    }
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException('Invalid datetime value');
      }
      return value;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid datetime value');
    }
    return parsed;
  }

  private resolveDurationMinutes(
    durationMinutes: number | undefined,
    startedAt?: Date | null,
    endedAt?: Date | null,
  ): number {
    if ((startedAt && !endedAt) || (!startedAt && endedAt)) {
      throw new BadRequestException(
        'startedAt and endedAt must be provided together',
      );
    }

    if (startedAt && endedAt) {
      const diff = Math.round(
        (endedAt.getTime() - startedAt.getTime()) / 60000,
      );
      if (diff <= 0) {
        throw new BadRequestException('endedAt must be later than startedAt');
      }
      return diff;
    }

    if (!durationMinutes || durationMinutes <= 0) {
      throw new BadRequestException(
        'durationMinutes is required when startedAt and endedAt are missing',
      );
    }

    return durationMinutes;
  }

  private async syncTaskActualsCascade(
    taskId: string,
    projectId: string,
    orgId: string,
  ): Promise<void> {
    let currentTaskId: string | null | undefined = taskId;
    const visitedTaskIds = new Set<string>();

    while (currentTaskId && !visitedTaskIds.has(currentTaskId)) {
      visitedTaskIds.add(currentTaskId);

      const task = await this.syncSingleTaskActuals(
        currentTaskId,
        projectId,
        orgId,
      );
      currentTaskId = task?.parentTaskId;
    }
  }

  private async syncSingleTaskActuals(
    taskId: string,
    projectId: string,
    orgId: string,
  ): Promise<Task | null> {
    const task = await this.taskRepo.findOne({
      where: {
        id: taskId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
      select: { id: true, parentTaskId: true },
    });

    if (!task) {
      return null;
    }

    const worklogs = await this.taskWorklogRepo.find({
      where: {
        taskId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
      order: { workDate: 'ASC', startedAt: 'ASC', createdAt: 'ASC' },
    });

    const childTasks = await this.taskRepo.find({
      where: {
        parentTaskId: taskId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
      select: { id: true, actualLoggedMinutes: true, actualStart: true },
    });

    const directLoggedMinutes = worklogs.reduce(
      (sum, item) => sum + item.durationMinutes,
      0,
    );
    const childLoggedMinutes = childTasks.reduce(
      (sum, item) => sum + Number(item.actualLoggedMinutes ?? 0),
      0,
    );
    const actualLoggedMinutes = directLoggedMinutes + childLoggedMinutes;

    const actualStartCandidates = [
      ...worklogs.map(
        (item) => item.startedAt ?? new Date(`${item.workDate}T00:00:00.000Z`),
      ),
      ...childTasks.map((item) => item.actualStart).filter(Boolean),
    ] as Date[];
    const actualStart = actualStartCandidates.reduce<Date | null>(
      (earliest, candidate) => {
        if (!earliest || candidate.getTime() < earliest.getTime()) {
          return candidate;
        }
        return earliest;
      },
      null,
    );

    await this.taskRepo.update(
      { id: taskId, projectId, organizationId: orgId, deletedAt: IsNull() },
      {
        actualLoggedMinutes,
        actualStart: (actualStart ?? null) as any,
      },
    );

    return task;
  }

  private async toResponses(
    worklogs: TaskWorklog[],
    task: Task,
  ): Promise<TaskWorklogResponse[]> {
    if (!worklogs.length) {
      return [];
    }

    const users = await this.userRepo.find({
      where: {
        id: In([...new Set(worklogs.map((item) => item.userId))]),
        deletedAt: IsNull(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));

    return worklogs.map((worklog) => this.mapResponse(worklog, task, userMap));
  }

  private async toResponse(
    worklog: TaskWorklog,
    task: Task,
  ): Promise<TaskWorklogResponse> {
    const [user] = await this.userRepo.find({
      where: { id: worklog.userId, deletedAt: IsNull() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
      take: 1,
    });

    return this.mapResponse(
      worklog,
      task,
      new Map(user ? [[user.id, user]] : []),
    );
  }

  private mapResponse(
    worklog: TaskWorklog,
    task: Task,
    userMap: Map<string, Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>>,
  ): TaskWorklogResponse {
    const user = userMap.get(worklog.userId);
    const userDisplayName = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return plainToInstance(TaskWorklogResponse, {
      ...worklog,
      taskTitle: task.title,
      taskSlug: task.slug,
      userDisplayName: userDisplayName || user?.email || worklog.userId,
      userEmail: user?.email,
    });
  }
}
