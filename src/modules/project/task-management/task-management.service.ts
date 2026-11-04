import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  IsNull,
  Not,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { isUUID } from 'class-validator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Task } from './entities/task.entity';
import {
  buildTaskDoneLateSql,
  buildTaskDoneOnTimeSql,
  buildTaskDueAfterSql,
  buildTaskDuePassedSql,
  buildTaskDueSoonSql,
  isTaskCompletedOnTime,
  isTaskDuePassed,
  resolveTaskDueCutoff,
} from './utils/task-due-date.helper';
import { TaskSlugCounter } from './entities/task-slug-counter.entity';
import { ProjectCoreService } from '../core/project-core.service';
import { CreateTaskRequest } from './dto/request/create-task.request';
import { UpdateTaskRequest } from './dto/request/update-task.request';
import { UpdateTaskStatusRequest } from './dto/request/update-task-status.request';
import { DuplicateTaskRequest } from './dto/request/duplicate-task.request';
import { TaskDueState, TaskResponse } from './dto/response/task.response';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { TaskHistory, TaskHistoryAction } from './entities/task-history.entity';
import { TaskTag } from './entities/task-tag.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import {
  TaskComment,
  TaskCommentAuthorRole,
} from './entities/task-comment.entity';
import { TaskCommentMention } from './entities/task-comment-mention.entity';
import { TaskCommentReaction } from './entities/task-comment-reaction.entity';
import { AddTaskTagRequest } from './dto/request/add-task-tag.request';
import { AddTaskAttachmentRequest } from './dto/request/add-task-attachment.request';
import { CreateTaskCommentRequest } from './dto/request/create-task-comment.request';
import { AddCommentReactionRequest } from './dto/request/add-comment-reaction.request';
import { TaskHistoryResponse } from './dto/response/task-history.response';
import { TaskTagResponse } from './dto/response/task-tag.response';
import { TaskAttachmentResponse } from './dto/response/task-attachment.response';
import { TaskCommentResponse } from './dto/response/task-comment.response';
import { MemberTaskProgressResponse } from './dto/response/member-task-progress.response';
import { User } from '@modules/users/entities/user.entity';
import { Project } from '../core/entities/project.entity';
import { ProjectMember } from '../core/entities/project-member.entity';
import { ScopeType, UserRole } from '@modules/rbac/entities/user-role.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import { StatusTask } from '../status-task/entities/status-task.entity';
import { ImageKitService } from '@modules/imagekit/imagekit.service';
import { PROJECT_REALTIME_EVENTS } from '../realtime/constants/project-realtime-events.constant';
import { PROJECT_NOTIFICATION_EVENTS } from '../notifications/constants/project-notification-events.constant';

const MAX_TAGS_PER_TASK = 20;
const THUMBS_UP_REACTION = 'thumbs_up';
const LOCAL_ATTACHMENT_URL_PREFIX = 'local://';
const LOCAL_ATTACHMENT_ROOT_DIR = path.resolve(
  process.cwd(),
  'storage',
  'project-task-attachments',
);
const MAX_LOCAL_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;
const TASK_DUE_SOON_WINDOW_HOURS = 24;
const TASK_DUE_SOON_WINDOW_MS = TASK_DUE_SOON_WINDOW_HOURS * 60 * 60 * 1000;

@Injectable()
export class TaskManagementService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,

    @InjectRepository(TaskSlugCounter)
    private readonly taskSlugCounterRepo: Repository<TaskSlugCounter>,

    @InjectRepository(StatusTask)
    private readonly statusTaskRepo: Repository<StatusTask>,

    @InjectRepository(TaskHistory)
    private readonly taskHistoryRepo: Repository<TaskHistory>,

    @InjectRepository(TaskTag)
    private readonly taskTagRepo: Repository<TaskTag>,

    @InjectRepository(TaskAttachment)
    private readonly taskAttachmentRepo: Repository<TaskAttachment>,

    @InjectRepository(TaskComment)
    private readonly taskCommentRepo: Repository<TaskComment>,

    @InjectRepository(TaskCommentMention)
    private readonly taskCommentMentionRepo: Repository<TaskCommentMention>,

    @InjectRepository(TaskCommentReaction)
    private readonly taskCommentReactionRepo: Repository<TaskCommentReaction>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    private readonly projectCoreService: ProjectCoreService,
    private readonly imagekitService: ImageKitService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createTask(
    projectId: string,
    orgId: string,
    userId: string,
    dto: CreateTaskRequest,
  ): Promise<TaskResponse> {
    const project = await this.projectCoreService.getProjectEntity(
      projectId,
      orgId,
    );
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const hasCreatePermission =
      await this.projectCoreService.hasProjectPermission(
        userId,
        orgId,
        projectId,
        PERMISSIONS.PROJECTS.TASKS.CREATE,
      );
    const hasAssignPermission =
      await this.projectCoreService.hasProjectPermission(
        userId,
        orgId,
        projectId,
        PERMISSIONS.PROJECTS.TASKS.ASSIGN,
      );

    const assignedTo = dto.assignedTo ?? userId;
    if (!hasCreatePermission) {
      throw new ForbiddenException(
        'Missing permission: ' + PERMISSIONS.PROJECTS.TASKS.CREATE,
      );
    }
    if (assignedTo !== userId && !hasAssignPermission) {
      throw new ForbiddenException(
        'You do not have permission to assign task to other members',
      );
    }

    await this.validateTaskAssignee(projectId, orgId, assignedTo);
    const parentTaskId = await this.resolveValidatedParentTaskId(
      projectId,
      orgId,
      dto.parentTaskId,
    );
    const statusId =
      (await this.resolveActiveStatusId(projectId, orgId, dto.statusId)) ??
      (await this.resolveDefaultStatusId(projectId, orgId));
    const statusName = await this.resolveStatusNameById(
      projectId,
      orgId,
      statusId,
    );
    const slug = await this.generateTaskSlug(project);
    const normalizedDueDate = this.toDateOrUndefined(dto.dueDate);
    const normalizedActualStart = this.toDateOrUndefined(dto.actualStart);
    const normalizedActualEnd = this.toDateOrUndefined(dto.actualEnd);
    this.validateTaskTimeline(
      undefined,
      normalizedDueDate,
      undefined,
      normalizedActualStart,
      normalizedActualEnd,
    );

    const task = this.taskRepo.create({
      projectId,
      organizationId: orgId,
      title: dto.title,
      slug,
      parentTaskId: parentTaskId ?? undefined,
      description: dto.description,
      priority: dto.priority,
      statusId,
      assignedTo,
      dueDate: normalizedDueDate,
      actualStart: normalizedActualStart,
      actualEnd: normalizedActualEnd,
      createdBy: userId,
    });

    const saved = await this.taskRepo.save(task);
    await this.createTaskHistory({
      task: saved,
      action: TaskHistoryAction.CREATE,
      actorId: userId,
      toValue: statusName,
      metadata: {
        title: saved.title,
        description: saved.description,
        slug: saved.slug,
      },
    });

    await this.projectCoreService.recalculateProjectProgress(projectId, orgId);
    const response = await this.toTaskResponse(saved);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_CREATED, {
      ...this.buildRealtimeMeta(projectId, userId),
      task: response,
    });
    if (assignedTo !== userId) {
      this.eventEmitter.emit(PROJECT_NOTIFICATION_EVENTS.TASK_ASSIGNED, {
        ...this.buildRealtimeMeta(projectId, userId),
        organizationId: orgId,
        taskId: saved.id,
        assigneeUserId: assignedTo,
      });
    }
    return response;
  }

  async getTasks(
    projectId: string,
    orgId: string,
    userId: string,
    page = 1,
    limit = 20,
    assigneeId?: string,
    dueState?: TaskDueState,
  ): Promise<TaskResponse[]> {
    await this.projectCoreService.getProjectEntity(projectId, orgId);
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    await this.projectCoreService.assertProjectPermission(
      userId,
      orgId,
      projectId,
      PERMISSIONS.PROJECTS.TASKS.LIST,
    );

    const take = Math.max(1, Math.min(limit, 100));
    const skip = (Math.max(page, 1) - 1) * take;

    if (assigneeId) {
      await this.projectCoreService.ensureUserInProject(
        projectId,
        orgId,
        assigneeId,
        {},
      );
    }
    this.validateTaskDueState(dueState);

    const query = this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        StatusTask,
        'status',
        [
          'status.id = task.status_id',
          'status.project_id = task.project_id',
          'status.organization_id = task.organization_id',
          'status.deleted_at IS NULL',
        ].join(' AND '),
      )
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL');

    if (assigneeId) {
      query.andWhere('task.assigned_to = :assigneeId', { assigneeId });
    }

    if (dueState) {
      this.applyTaskDueStateFilter(query, dueState);
    }

    const tasks = await query
      .orderBy('task.created_at', 'DESC')
      .offset(skip)
      .limit(take)
      .getMany();

    return this.toTaskResponses(tasks);
  }

  async getMemberTaskProgress(
    projectId: string,
    orgId: string,
    userId: string,
    targetUserId?: string,
  ): Promise<MemberTaskProgressResponse[]> {
    await this.projectCoreService.getProjectEntity(projectId, orgId);
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    await this.projectCoreService.assertProjectPermission(
      userId,
      orgId,
      projectId,
      PERMISSIONS.PROJECTS.MEMBERS.LIST,
    );

    if (targetUserId && !isUUID(targetUserId, '4')) {
      throw new BadRequestException('targetUserId must be a valid UUID');
    }

    const memberQuery = this.projectMemberRepo
      .createQueryBuilder('pm')
      .leftJoin(User, 'u', 'u.id = pm.user_id AND u.deleted_at IS NULL')
      .leftJoin(
        Role,
        'legacyRole',
        'legacyRole.id = pm.role_id AND legacyRole.deleted_at IS NULL',
      )
      .where('pm.project_id = :projectId', { projectId })
      .andWhere('pm.organization_id = :orgId', { orgId })
      .andWhere('pm.is_active = true')
      .andWhere('pm.deleted_at IS NULL');

    if (targetUserId) {
      memberQuery.andWhere('pm.user_id = :targetUserId', { targetUserId });
    }

    const memberRows = await memberQuery
      .select([
        'pm.user_id AS "userId"',
        'pm.role_id AS "roleId"',
        'u.first_name AS "firstName"',
        'u.last_name AS "lastName"',
        'u.email AS "email"',
        'u.avatar_url AS "avatar"',
        'legacyRole.name AS "roleName"',
      ])
      .orderBy('pm.joined_at', 'ASC')
      .getRawMany<{
        userId: string;
        roleId?: string;
        roleName?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        avatar?: string;
      }>();

    if (targetUserId && !memberRows.length) {
      throw new NotFoundException('Project member not found');
    }

    if (!memberRows.length) return [];

    const memberUserIds = [...new Set(memberRows.map((item) => item.userId))];
    const roleAssignmentsByUserId =
      await this.getProjectRoleAssignmentsByUserIds(
        projectId,
        orgId,
        memberUserIds,
      );
    const now = new Date();
    const dueSoonAt = new Date(now.getTime() + TASK_DUE_SOON_WINDOW_MS);
    const doneStatusCondition =
      "LOWER(REGEXP_REPLACE(COALESCE(status.name, ''), '\\s+', '_', 'g')) = 'done'";

    const statsRows = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        Task,
        'child',
        [
          'child.parent_task_id = task.id',
          'child.project_id = task.project_id',
          'child.organization_id = task.organization_id',
          'child.deleted_at IS NULL',
        ].join(' AND '),
      )
      .leftJoin(
        StatusTask,
        'status',
        [
          'status.id = task.status_id',
          'status.project_id = task.project_id',
          'status.organization_id = task.organization_id',
          'status.deleted_at IS NULL',
        ].join(' AND '),
      )
      .select('task.assigned_to', 'userId')
      .addSelect('COUNT(task.id)', 'totalAssignedTasks')
      .addSelect(
        `SUM(CASE WHEN ${doneStatusCondition} THEN 1 ELSE 0 END)`,
        'doneTasks',
      )
      .addSelect(
        `SUM(CASE WHEN ${doneStatusCondition} AND task.due_date IS NOT NULL AND task.completed_at IS NOT NULL AND ${buildTaskDoneOnTimeSql()} THEN 1 ELSE 0 END)`,
        'doneOnTimeTasks',
      )
      .addSelect(
        `SUM(CASE WHEN ${doneStatusCondition} AND task.due_date IS NOT NULL AND task.completed_at IS NOT NULL AND ${buildTaskDoneLateSql()} THEN 1 ELSE 0 END)`,
        'doneLateTasks',
      )
      .addSelect(
        `SUM(CASE WHEN NOT (${doneStatusCondition}) AND task.due_date IS NOT NULL AND ${buildTaskDuePassedSql()} THEN 1 ELSE 0 END)`,
        'overdueOpenTasks',
      )
      .addSelect(
        `SUM(CASE WHEN NOT (${doneStatusCondition}) AND task.due_date IS NOT NULL AND ${buildTaskDueSoonSql()} THEN 1 ELSE 0 END)`,
        'dueSoonTasks',
      )
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :orgId', { orgId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('task.assigned_to IN (:...memberUserIds)', { memberUserIds })
      .andWhere('child.id IS NULL')
      .setParameters({ now, dueSoonAt })
      .groupBy('task.assigned_to')
      .getRawMany<{
        userId: string;
        totalAssignedTasks: string;
        doneTasks: string;
        doneOnTimeTasks: string;
        doneLateTasks: string;
        overdueOpenTasks: string;
        dueSoonTasks: string;
      }>();

    const statsByUserId = new Map(statsRows.map((row) => [row.userId, row]));
    const toNumber = (value?: string): number => Number(value ?? 0);

    return memberRows.map((member) => {
      const stats = statsByUserId.get(member.userId);
      const totalAssignedTasks = toNumber(stats?.totalAssignedTasks);
      const doneTasks = toNumber(stats?.doneTasks);
      const doneOnTimeTasks = toNumber(stats?.doneOnTimeTasks);
      const doneLateTasks = toNumber(stats?.doneLateTasks);
      const overdueOpenTasks = toNumber(stats?.overdueOpenTasks);
      const dueSoonTasks = toNumber(stats?.dueSoonTasks);
      const openTasks = Math.max(totalAssignedTasks - doneTasks, 0);
      const completionRate = totalAssignedTasks
        ? Math.round((doneTasks / totalAssignedTasks) * 100)
        : 0;
      const onTimeRate = doneTasks
        ? Math.round((doneOnTimeTasks / doneTasks) * 100)
        : 0;
      const progressScore = Math.round(completionRate * 0.7 + onTimeRate * 0.3);
      const fullName = [member.firstName, member.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      const assignedRoles = roleAssignmentsByUserId.get(member.userId) ?? [];
      const primaryAssignedRole = assignedRoles[0];
      const roleIds = assignedRoles.map((role) => role.roleId);
      const roleNames = assignedRoles.map((role) => role.roleName);

      return plainToInstance(MemberTaskProgressResponse, {
        userId: member.userId,
        roleId: member.roleId ?? primaryAssignedRole?.roleId,
        roleName: member.roleName ?? primaryAssignedRole?.roleName,
        roleIds,
        roleNames,
        fullName: fullName || member.email || member.userId,
        email: member.email,
        avatar: member.avatar,
        totalAssignedTasks,
        doneTasks,
        openTasks,
        doneOnTimeTasks,
        doneLateTasks,
        overdueOpenTasks,
        dueSoonTasks,
        completionRate,
        onTimeRate,
        progressScore,
      });
    });
  }

  private async getProjectRoleAssignmentsByUserIds(
    projectId: string,
    orgId: string,
    userIds: string[],
  ): Promise<
    Map<string, Array<{ roleId: string; roleName: string; assignedAt: Date }>>
  > {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    const rolesByUserId = new Map<
      string,
      Array<{ roleId: string; roleName: string; assignedAt: Date }>
    >();
    if (!uniqueUserIds.length) return rolesByUserId;

    const rows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id IN (:...userIds)', { userIds: uniqueUserIds })
      .andWhere('ur.organization_id = :orgId', { orgId })
      .andWhere('ur.scope_type = :scopeType', { scopeType: ScopeType.PROJECT })
      .andWhere('ur.scope_id = :projectId', { projectId })
      .andWhere('r.project_id = :projectId', { projectId })
      .andWhere('r.deleted_at IS NULL')
      .select([
        'ur.user_id AS "userId"',
        'ur.role_id AS "roleId"',
        'r.name AS "roleName"',
        'ur.assigned_at AS "assignedAt"',
      ])
      .orderBy(
        `CASE
          WHEN r.name = 'project_owner' THEN 0
          WHEN r.name = 'project_manager' THEN 1
          ELSE 2
        END`,
        'ASC',
      )
      .addOrderBy('ur.assigned_at', 'ASC')
      .getRawMany<{
        userId: string;
        roleId: string;
        roleName: string;
        assignedAt: Date;
      }>();

    for (const row of rows) {
      const assignedRoles = rolesByUserId.get(row.userId) ?? [];
      assignedRoles.push({
        roleId: row.roleId,
        roleName: row.roleName,
        assignedAt: row.assignedAt,
      });
      rolesByUserId.set(row.userId, assignedRoles);
    }

    return rolesByUserId;
  }

  async getTaskById(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<TaskResponse> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanViewTask(task, userId, orgId);
    return this.toTaskResponse(task);
  }

  async updateTask(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
    dto: UpdateTaskRequest,
  ): Promise<TaskResponse> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanUpdateTask(task, userId, orgId);
    const oldStatus = await this.resolveTaskStatusLabel(task);
    const previousAssigneeUserId = task.assignedTo;
    let nextStatusName: string | undefined;

    if (dto.assignedTo !== undefined && dto.assignedTo !== task.assignedTo) {
      await this.projectCoreService.assertProjectPermission(
        userId,
        orgId,
        projectId,
        PERMISSIONS.PROJECTS.TASKS.ASSIGN,
      );
      await this.validateTaskAssignee(projectId, orgId, dto.assignedTo);
    }

    if (dto.estimatedPoint !== undefined || dto.estimatedHours !== undefined) {
      await this.projectCoreService.assertProjectPermission(
        userId,
        orgId,
        projectId,
        PERMISSIONS.PROJECTS.TASKS.LOG_TIME,
      );
    }

    if (dto.parentTaskId !== undefined) {
      const parentTaskId = await this.resolveValidatedParentTaskId(
        projectId,
        orgId,
        dto.parentTaskId as string | null,
        task.id,
      );
      task.parentTaskId = parentTaskId ?? undefined;
    }

    if (dto.statusId !== undefined) {
      const nextStatusId =
        (await this.resolveActiveStatusId(projectId, orgId, dto.statusId)) ??
        undefined;
      task.statusId = nextStatusId;
      nextStatusName = await this.resolveStatusNameById(
        projectId,
        orgId,
        nextStatusId,
      );
    }

    const oldDescription = task.description ?? '';
    const { statusId: _statusId, ...payload } = dto as UpdateTaskRequest;

    if (payload.dueDate !== undefined) {
      payload.dueDate = this.toDateOrUndefined(payload.dueDate);
    }
    if (payload.startedAt !== undefined) {
      payload.startedAt = this.toDateOrUndefined(payload.startedAt);
    }
    if (payload.completedAt !== undefined) {
      payload.completedAt = this.toDateOrUndefined(payload.completedAt);
    }
    if (payload.actualStart !== undefined) {
      payload.actualStart = this.toDateOrUndefined(payload.actualStart);
    }
    if (payload.actualEnd !== undefined) {
      payload.actualEnd = this.toDateOrUndefined(payload.actualEnd);
    }

    Object.assign(task, payload);
    if (dto.statusId !== undefined) {
      if (this.isDoneStatusName(nextStatusName)) {
        task.completedAt = task.completedAt ?? new Date();
      } else {
        task.completedAt = undefined;
      }
    }
    this.validateTaskTimeline(
      task.startedAt,
      task.dueDate,
      task.completedAt,
      task.actualStart,
      task.actualEnd,
    );
    const actorDisplayName = await this.getActorDisplayName(userId);
    const saved = await this.taskRepo.manager.transaction(async (manager) => {
      const savedTask = await manager.save(Task, task);

      if (
        dto.description !== undefined &&
        (dto.description ?? '') !== oldDescription
      ) {
        await manager.save(TaskHistory, {
          taskId: savedTask.id,
          projectId: savedTask.projectId,
          organizationId: savedTask.organizationId,
          action: TaskHistoryAction.DESCRIPTION_CHANGE,
          actorId: userId,
          actorDisplayName,
          fromValue: oldDescription,
          toValue: dto.description ?? '',
        });
      }

      if (
        dto.statusId !== undefined &&
        nextStatusName &&
        oldStatus !== nextStatusName
      ) {
        await manager.save(TaskHistory, {
          taskId: savedTask.id,
          projectId: savedTask.projectId,
          organizationId: savedTask.organizationId,
          action: TaskHistoryAction.STATUS_CHANGE,
          actorId: userId,
          actorDisplayName,
          fromValue: oldStatus,
          toValue: nextStatusName,
        });
      }

      return savedTask;
    });

    if (dto.statusId !== undefined || dto.parentTaskId !== undefined) {
      await this.projectCoreService.recalculateProjectProgress(
        projectId,
        orgId,
      );
    }

    const response = await this.toTaskResponse(saved);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_UPDATED, {
      ...this.buildRealtimeMeta(projectId, userId),
      task: response,
    });
    if (
      dto.assignedTo !== undefined &&
      dto.assignedTo !== previousAssigneeUserId &&
      dto.assignedTo
    ) {
      if (previousAssigneeUserId) {
        this.eventEmitter.emit(PROJECT_NOTIFICATION_EVENTS.TASK_REASSIGNED, {
          ...this.buildRealtimeMeta(projectId, userId),
          organizationId: orgId,
          taskId: saved.id,
          previousAssigneeUserId,
          nextAssigneeUserId: dto.assignedTo,
        });
      } else {
        this.eventEmitter.emit(PROJECT_NOTIFICATION_EVENTS.TASK_ASSIGNED, {
          ...this.buildRealtimeMeta(projectId, userId),
          organizationId: orgId,
          taskId: saved.id,
          assigneeUserId: dto.assignedTo,
        });
      }
    }
    if (
      dto.statusId !== undefined &&
      nextStatusName &&
      oldStatus !== nextStatusName
    ) {
      this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_STATUS_CHANGED, {
        ...this.buildRealtimeMeta(projectId, userId),
        task: response,
      });
      if (saved.assignedTo) {
        this.eventEmitter.emit(
          PROJECT_NOTIFICATION_EVENTS.TASK_STATUS_CHANGED,
          {
            ...this.buildRealtimeMeta(projectId, userId),
            organizationId: orgId,
            taskId: saved.id,
            assigneeUserId: saved.assignedTo,
            fromStatus: oldStatus,
            toStatus: nextStatusName,
          },
        );
      }
    }

    return response;
  }

  async duplicateTask(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
    dto: DuplicateTaskRequest,
  ): Promise<TaskResponse> {
    const [sourceTask, project] = await Promise.all([
      this.getTaskEntity(taskId, projectId, orgId),
      this.projectCoreService.getProjectEntity(projectId, orgId),
    ]);

    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    await this.ensureCanUpdateTask(sourceTask, userId, orgId);

    const hasCreatePermission =
      await this.projectCoreService.hasProjectPermission(
        userId,
        orgId,
        projectId,
        PERMISSIONS.PROJECTS.TASKS.CREATE,
      );
    const hasAssignPermission =
      await this.projectCoreService.hasProjectPermission(
        userId,
        orgId,
        projectId,
        PERMISSIONS.PROJECTS.TASKS.ASSIGN,
      );

    const assignedTo = dto.assigneeUserId ?? sourceTask.assignedTo ?? userId;
    if (!hasCreatePermission) {
      throw new ForbiddenException(
        'Missing permission: ' + PERMISSIONS.PROJECTS.TASKS.CREATE,
      );
    }
    if (assignedTo !== userId && !hasAssignPermission) {
      throw new ForbiddenException(
        'You do not have permission to assign task to other members',
      );
    }

    await this.validateTaskAssignee(projectId, orgId, assignedTo);

    const targetParentTaskId =
      dto.parentTaskId !== undefined
        ? dto.parentTaskId
        : dto.keepParentTask
          ? sourceTask.parentTaskId
          : null;
    const parentTaskId = await this.resolveValidatedParentTaskId(
      projectId,
      orgId,
      targetParentTaskId,
    );

    const statusId =
      (await this.resolveActiveStatusId(
        projectId,
        orgId,
        sourceTask.statusId,
      )) ?? (await this.resolveDefaultStatusId(projectId, orgId));

    const duplicatedTask = this.taskRepo.create({
      projectId,
      organizationId: orgId,
      title: sourceTask.title,
      slug: await this.generateTaskSlug(project),
      parentTaskId: parentTaskId ?? undefined,
      description: sourceTask.description,
      statusId,
      priority: sourceTask.priority,
      assignedTo,
      createdBy: userId,
      dueDate: sourceTask.dueDate,
      startedAt: sourceTask.startedAt,
      completedAt: sourceTask.completedAt,
      actualStart: sourceTask.actualStart,
      actualEnd: sourceTask.actualEnd,
    });
    const saved = await this.taskRepo.save(duplicatedTask);

    if (dto.copyTags) {
      const sourceTags = await this.taskTagRepo.find({
        where: { taskId, projectId, organizationId: orgId },
      });
      if (sourceTags.length) {
        await this.taskTagRepo.save(
          sourceTags.map((item) =>
            this.taskTagRepo.create({
              taskId: saved.id,
              projectId,
              organizationId: orgId,
              name: item.name,
              normalizedName: item.normalizedName,
              createdBy: userId,
            }),
          ),
        );
      }
    }

    if (dto.copyAttachments) {
      const sourceAttachments = await this.taskAttachmentRepo.find({
        where: { taskId, projectId, organizationId: orgId },
      });
      if (sourceAttachments.length) {
        await this.taskAttachmentRepo.save(
          sourceAttachments.map((item) =>
            this.taskAttachmentRepo.create({
              taskId: saved.id,
              projectId,
              organizationId: orgId,
              fileName: item.fileName,
              fileUrl: item.fileUrl,
              mimeType: item.mimeType,
              fileSize: item.fileSize,
              uploadedBy: userId,
            }),
          ),
        );
      }
    }

    await this.createTaskHistory({
      task: saved,
      action: TaskHistoryAction.CREATE,
      actorId: userId,
      metadata: {
        duplicatedFromTaskId: sourceTask.id,
        copiedTags: !!dto.copyTags,
        copiedAttachments: !!dto.copyAttachments,
      },
    });

    await this.projectCoreService.recalculateProjectProgress(projectId, orgId);

    const response = await this.toTaskResponse(saved);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_CREATED, {
      ...this.buildRealtimeMeta(projectId, userId),
      task: response,
    });
    if (assignedTo !== userId) {
      this.eventEmitter.emit(PROJECT_NOTIFICATION_EVENTS.TASK_ASSIGNED, {
        ...this.buildRealtimeMeta(projectId, userId),
        organizationId: orgId,
        taskId: saved.id,
        assigneeUserId: assignedTo,
      });
    }
    return response;
  }

  async deleteTask(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.projectCoreService.assertProjectPermission(
      userId,
      orgId,
      projectId,
      PERMISSIONS.PROJECTS.TASKS.DELETE,
    );

    const now = new Date();
    const deletedTaskIds = await this.taskRepo.manager.transaction(
      async (manager) => {
        const taskTree = await this.collectActiveTaskTree(task, manager);

        for (const item of taskTree) {
          item.deletedAt = now;
          item.deletedBy = userId;
        }

        await manager.save(Task, taskTree);
        return taskTree.map((item) => item.id);
      },
    );

    await this.projectCoreService.recalculateProjectProgress(projectId, orgId);
    for (const deletedTaskId of deletedTaskIds) {
      this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_DELETED, {
        ...this.buildRealtimeMeta(projectId, userId),
        taskId: deletedTaskId,
      });
    }
  }

  async updateTaskStatus(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
    dto: UpdateTaskStatusRequest,
  ): Promise<TaskResponse> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    const hasPermission = await this.projectCoreService.hasProjectPermission(
      userId,
      orgId,
      projectId,
      PERMISSIONS.PROJECTS.TASKS.CHANGE_STATUS,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Missing permission: ' + PERMISSIONS.PROJECTS.TASKS.CHANGE_STATUS,
      );
    }

    const targetStatus = await this.getActiveStatusEntity(
      projectId,
      orgId,
      dto.statusId,
    );
    const oldStatus = await this.resolveTaskStatusLabel(task);

    task.statusId = targetStatus.id;

    if (this.isDoneStatusName(targetStatus.name)) {
      task.completedAt = new Date();
    } else if (task.completedAt) {
      task.completedAt = undefined;
    }
    this.validateTaskTimeline(
      task.startedAt,
      task.dueDate,
      task.completedAt,
      task.actualStart,
      task.actualEnd,
    );

    const saved = await this.taskRepo.save(task);

    if (oldStatus !== targetStatus.name) {
      await this.createTaskHistory({
        task: saved,
        action: TaskHistoryAction.STATUS_CHANGE,
        actorId: userId,
        fromValue: oldStatus,
        toValue: targetStatus.name,
      });
    }

    await this.projectCoreService.recalculateProjectProgress(projectId, orgId);

    const response = await this.toTaskResponse(saved);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_STATUS_CHANGED, {
      ...this.buildRealtimeMeta(projectId, userId),
      task: response,
    });
    if (oldStatus !== targetStatus.name && saved.assignedTo) {
      this.eventEmitter.emit(PROJECT_NOTIFICATION_EVENTS.TASK_STATUS_CHANGED, {
        ...this.buildRealtimeMeta(projectId, userId),
        organizationId: orgId,
        taskId: saved.id,
        assigneeUserId: saved.assignedTo,
        fromStatus: oldStatus,
        toStatus: targetStatus.name,
      });
    }
    return response;
  }

  async getTaskHistory(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<TaskHistoryResponse[]> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanViewTask(task, userId, orgId);

    const histories = await this.taskHistoryRepo.find({
      where: {
        taskId,
        projectId,
        organizationId: orgId,
        action: Not(TaskHistoryAction.COMMENT_ADD),
      },
      order: { createdAt: 'DESC' },
    });

    return histories.map((history) =>
      plainToInstance(TaskHistoryResponse, {
        ...history,
        relativeTime: this.toRelativeTime(history.createdAt),
      }),
    );
  }

  async getTaskTags(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<TaskTagResponse[]> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanViewTask(task, userId, orgId);

    const tags = await this.taskTagRepo.find({
      where: { taskId, projectId, organizationId: orgId },
      order: { createdAt: 'ASC' },
    });

    return plainToInstance(TaskTagResponse, tags);
  }

  async addTaskTag(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
    dto: AddTaskTagRequest,
  ): Promise<TaskTagResponse> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanUpdateTask(task, userId, orgId);

    const name = this.normalizeTagName(dto.name);
    if (!name) throw new BadRequestException('Tag name cannot be empty');
    const normalizedName = name.toLowerCase();

    const [totalTags, existing] = await Promise.all([
      this.taskTagRepo.count({
        where: { taskId, projectId, organizationId: orgId },
      }),
      this.taskTagRepo.findOne({
        where: { taskId, projectId, organizationId: orgId, normalizedName },
      }),
    ]);

    if (existing) {
      throw new ConflictException('Tag already exists in this task');
    }
    if (totalTags >= MAX_TAGS_PER_TASK) {
      throw new BadRequestException(
        `A task can have at most ${MAX_TAGS_PER_TASK} tags`,
      );
    }

    const tag = this.taskTagRepo.create({
      taskId,
      projectId,
      organizationId: orgId,
      name,
      normalizedName,
      createdBy: userId,
    });
    const saved = await this.taskTagRepo.save(tag);

    await this.createTaskHistory({
      task,
      action: TaskHistoryAction.TAG_ADD,
      actorId: userId,
      toValue: saved.name,
      metadata: { tagId: saved.id },
    });

    const response = plainToInstance(TaskTagResponse, saved);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_TAG_ADDED, {
      ...this.buildRealtimeMeta(projectId, userId),
      taskId,
      tag: response,
    });
    return response;
  }

  async removeTaskTag(
    taskId: string,
    tagId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanUpdateTask(task, userId, orgId);

    const tag = await this.taskTagRepo.findOne({
      where: { id: tagId, taskId, projectId, organizationId: orgId },
    });
    if (!tag) throw new NotFoundException('Task tag not found');

    await this.taskTagRepo.remove(tag);

    await this.createTaskHistory({
      task,
      action: TaskHistoryAction.TAG_REMOVE,
      actorId: userId,
      fromValue: tag.name,
      metadata: { tagId: tag.id },
    });

    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_TAG_REMOVED, {
      ...this.buildRealtimeMeta(projectId, userId),
      taskId,
      tag: plainToInstance(TaskTagResponse, tag),
    });
  }

  async getTaskAttachments(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<TaskAttachmentResponse[]> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanManageTaskAttachment(
      task,
      userId,
      orgId,
      PERMISSIONS.PROJECTS.ATTACHMENTS.LIST,
      'view',
    );

    const attachments = await this.taskAttachmentRepo.find({
      where: { taskId, projectId, organizationId: orgId },
      order: { createdAt: 'DESC' },
    });

    return attachments.map((attachment) =>
      this.toTaskAttachmentResponse(attachment),
    );
  }

  async uploadToImagekitAndAttach(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
    file?: Express.Multer.File,
    folder?: string,
  ): Promise<TaskAttachmentResponse> {
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('Attachment file is empty');
    }
    if (file.size > MAX_LOCAL_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException(
        `Attachment file exceeds ${MAX_LOCAL_ATTACHMENT_SIZE_BYTES} bytes`,
      );
    }

    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanManageTaskAttachment(
      task,
      userId,
      orgId,
      PERMISSIONS.PROJECTS.ATTACHMENTS.UPLOAD,
      'upload',
    );

    const originalFileName = this.normalizeAttachmentFileName(
      file.originalname,
      'attachment',
    );
    const imagekitFolder = this.buildImagekitAttachmentFolder(
      orgId,
      projectId,
      taskId,
      folder,
    );
    const uploadResult = await this.imagekitService.uploadFile(
      {
        ...file,
        originalname: originalFileName,
      },
      imagekitFolder,
    );

    const attachment = this.taskAttachmentRepo.create({
      taskId,
      projectId,
      organizationId: orgId,
      fileName: this.normalizeAttachmentFileName(
        uploadResult.fileName,
        originalFileName,
      ),
      fileUrl: uploadResult.url,
      mimeType: file.mimetype || uploadResult.fileType,
      fileSize: uploadResult.size ?? file.size,
      uploadedBy: userId,
    });
    const saved = await this.taskAttachmentRepo.save(attachment);

    await this.createTaskHistory({
      task,
      action: TaskHistoryAction.ATTACHMENT_ADD,
      actorId: userId,
      toValue: saved.fileName,
      metadata: {
        attachmentId: saved.id,
        attachmentType: 'imagekit_upload',
        imagekitFolder,
      },
    });

    const response = this.toTaskAttachmentResponse(saved);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_ATTACHMENT_ADDED, {
      ...this.buildRealtimeMeta(projectId, userId),
      taskId,
      attachment: response,
    });
    return response;
  }

  private buildImagekitAttachmentFolder(
    orgId: string,
    projectId: string,
    taskId: string,
    folder?: string,
  ): string {
    const baseFolder = `project/task-attachments/${orgId}/${projectId}/${taskId}`;
    const customFolder = (folder ?? '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');

    if (!customFolder) return baseFolder;

    const sanitizedCustomFolder = customFolder
      .split('/')
      .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ''))
      .filter(Boolean)
      .join('/');

    return sanitizedCustomFolder
      ? `${baseFolder}/${sanitizedCustomFolder}`
      : baseFolder;
  }

  async addTaskWebLinkAttachment(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
    dto: AddTaskAttachmentRequest,
  ): Promise<TaskAttachmentResponse> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanManageTaskAttachment(
      task,
      userId,
      orgId,
      PERMISSIONS.PROJECTS.ATTACHMENTS.UPLOAD,
      'upload',
    );

    const attachment = this.taskAttachmentRepo.create({
      taskId,
      projectId,
      organizationId: orgId,
      fileName: this.normalizeAttachmentFileName(dto.fileName, 'web-link'),
      fileUrl: dto.fileUrl.trim(),
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      uploadedBy: userId,
    });
    const saved = await this.taskAttachmentRepo.save(attachment);

    await this.createTaskHistory({
      task,
      action: TaskHistoryAction.ATTACHMENT_ADD,
      actorId: userId,
      toValue: saved.fileName,
      metadata: {
        attachmentId: saved.id,
        attachmentType: 'web_link',
      },
    });

    const response = this.toTaskAttachmentResponse(saved);
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_ATTACHMENT_ADDED, {
      ...this.buildRealtimeMeta(projectId, userId),
      taskId,
      attachment: response,
    });
    return response;
  }

  async getTaskAttachmentContent(
    taskId: string,
    attachmentId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<
    | {
        kind: 'local_file';
        absolutePath: string;
        fileName: string;
        mimeType?: string;
      }
    | {
        kind: 'web_link';
        redirectUrl: string;
      }
  > {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanManageTaskAttachment(
      task,
      userId,
      orgId,
      PERMISSIONS.PROJECTS.ATTACHMENTS.LIST,
      'view',
    );

    const attachment = await this.taskAttachmentRepo.findOne({
      where: { id: attachmentId, taskId, projectId, organizationId: orgId },
    });
    if (!attachment) {
      throw new NotFoundException('Task attachment not found');
    }

    if (!this.isLocalAttachmentUrl(attachment.fileUrl)) {
      return {
        kind: 'web_link',
        redirectUrl: attachment.fileUrl,
      };
    }

    const absolutePath = this.resolveLocalAttachmentAbsolutePath(
      attachment.fileUrl,
    );
    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('Attachment file not found on local storage');
    }

    return {
      kind: 'local_file',
      absolutePath,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    };
  }

  async removeTaskAttachment(
    taskId: string,
    attachmentId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanManageTaskAttachment(
      task,
      userId,
      orgId,
      PERMISSIONS.PROJECTS.ATTACHMENTS.DELETE,
      'delete',
    );

    const attachment = await this.taskAttachmentRepo.findOne({
      where: { id: attachmentId, taskId, projectId, organizationId: orgId },
    });
    if (!attachment) throw new NotFoundException('Task attachment not found');

    const canDeletePhysicalFile = await this.canDeleteLocalAttachmentFile(
      attachment.id,
      attachment.fileUrl,
    );

    await this.taskAttachmentRepo.remove(attachment);

    if (canDeletePhysicalFile) {
      await this.deleteLocalAttachmentFile(attachment.fileUrl);
    }

    await this.createTaskHistory({
      task,
      action: TaskHistoryAction.ATTACHMENT_REMOVE,
      actorId: userId,
      fromValue: attachment.fileName,
      metadata: { attachmentId: attachment.id },
    });

    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_ATTACHMENT_REMOVED, {
      ...this.buildRealtimeMeta(projectId, userId),
      taskId,
      attachment: this.toTaskAttachmentResponse(attachment),
    });
  }

  async getTaskComments(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<TaskCommentResponse[]> {
    await this.projectCoreService.ensureUserInProject(projectId, orgId, userId, {
      allowOrgAdmin: true,
    });
    const task = await this.getTaskEntity(taskId, projectId, orgId);
    await this.ensureCanViewTask(task, userId, orgId);

    const comments = await this.taskCommentRepo.find({
      where: { taskId, projectId, organizationId: orgId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    return this.buildTaskCommentResponses(comments, userId);
  }

  async addTaskComment(
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
    dto: CreateTaskCommentRequest,
  ): Promise<TaskCommentResponse> {
    const [task, project] = await Promise.all([
      this.getTaskEntity(taskId, projectId, orgId),
      this.projectCoreService.getProjectEntity(projectId, orgId),
    ]);

    await this.assertCanCommentTask(project, userId, orgId);
    const authorRole = await this.resolveCommentAuthorRole(
      project,
      task,
      userId,
      orgId,
    );
    const mentionUserIds = await this.resolveMentionUserIds(
      dto,
      project,
      orgId,
    );
    const parentCommentId = await this.resolveValidatedParentCommentId(
      taskId,
      projectId,
      orgId,
      dto.parentCommentId,
    );

    const comment = this.taskCommentRepo.create({
      taskId,
      projectId,
      organizationId: orgId,
      parentCommentId: parentCommentId ?? undefined,
      authorId: userId,
      authorRole,
      content: dto.content,
    });
    const savedComment = await this.taskCommentRepo.save(comment);

    if (mentionUserIds.length) {
      const mentionEntities = mentionUserIds.map((mentionedUserId) =>
        this.taskCommentMentionRepo.create({
          commentId: savedComment.id,
          taskId,
          projectId,
          organizationId: orgId,
          mentionedUserId,
        }),
      );
      await this.taskCommentMentionRepo.upsert(mentionEntities, [
        'commentId',
        'mentionedUserId',
      ]);
    }

    const response = await this.getTaskCommentResponse(
      savedComment.id,
      taskId,
      projectId,
      orgId,
      userId,
    );
    this.eventEmitter.emit(PROJECT_REALTIME_EVENTS.TASK_COMMENT_CREATED, {
      ...this.buildRealtimeMeta(projectId, userId),
      taskId,
      comment: response,
    });
    if (mentionUserIds.length) {
      this.eventEmitter.emit(PROJECT_NOTIFICATION_EVENTS.TASK_MENTIONED, {
        ...this.buildRealtimeMeta(projectId, userId),
        organizationId: orgId,
        taskId,
        commentId: savedComment.id,
        mentionedUserIds: mentionUserIds,
      });
    }
    return response;
  }

  async toggleCommentThumbsUp(
    taskId: string,
    commentId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<TaskCommentResponse> {
    const [task, project] = await Promise.all([
      this.getTaskEntity(taskId, projectId, orgId),
      this.projectCoreService.getProjectEntity(projectId, orgId),
    ]);
    await this.assertCanCommentTask(project, userId, orgId);
    const comment = await this.getTaskCommentEntity(
      commentId,
      taskId,
      projectId,
      orgId,
    );

    const existing = await this.taskCommentReactionRepo.findOne({
      where: {
        commentId: comment.id,
        taskId,
        projectId,
        organizationId: orgId,
        userId,
        reaction: THUMBS_UP_REACTION,
      },
    });

    if (existing) {
      await this.taskCommentReactionRepo.remove(existing);
    } else {
      await this.taskCommentReactionRepo.save(
        this.taskCommentReactionRepo.create({
          commentId: comment.id,
          taskId,
          projectId,
          organizationId: orgId,
          userId,
          reaction: THUMBS_UP_REACTION,
        }),
      );
    }

    const response = await this.getTaskCommentResponse(
      comment.id,
      taskId,
      projectId,
      orgId,
      userId,
    );
    this.eventEmitter.emit(
      PROJECT_REALTIME_EVENTS.TASK_COMMENT_REACTION_UPDATED,
      {
        ...this.buildRealtimeMeta(projectId, userId),
        taskId,
        comment: response,
      },
    );
    return response;
  }

  async addCommentReaction(
    taskId: string,
    commentId: string,
    projectId: string,
    orgId: string,
    userId: string,
    dto: AddCommentReactionRequest,
  ): Promise<TaskCommentResponse> {
    const [task, project] = await Promise.all([
      this.getTaskEntity(taskId, projectId, orgId),
      this.projectCoreService.getProjectEntity(projectId, orgId),
    ]);
    await this.assertCanCommentTask(project, userId, orgId);
    const comment = await this.getTaskCommentEntity(
      commentId,
      taskId,
      projectId,
      orgId,
    );
    const reaction = this.normalizeReaction(dto.reaction);

    await this.taskCommentReactionRepo.upsert(
      this.taskCommentReactionRepo.create({
        commentId: comment.id,
        taskId,
        projectId,
        organizationId: orgId,
        userId,
        reaction,
      }),
      ['commentId', 'userId', 'reaction'],
    );

    const response = await this.getTaskCommentResponse(
      comment.id,
      taskId,
      projectId,
      orgId,
      userId,
    );
    this.eventEmitter.emit(
      PROJECT_REALTIME_EVENTS.TASK_COMMENT_REACTION_UPDATED,
      {
        ...this.buildRealtimeMeta(projectId, userId),
        taskId,
        comment: response,
      },
    );
    return response;
  }

  async removeCommentReaction(
    taskId: string,
    commentId: string,
    reaction: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<TaskCommentResponse> {
    const [task, project] = await Promise.all([
      this.getTaskEntity(taskId, projectId, orgId),
      this.projectCoreService.getProjectEntity(projectId, orgId),
    ]);
    await this.assertCanCommentTask(project, userId, orgId);
    const comment = await this.getTaskCommentEntity(
      commentId,
      taskId,
      projectId,
      orgId,
    );
    const normalizedReaction = this.normalizeReaction(reaction);

    await this.taskCommentReactionRepo.delete({
      commentId: comment.id,
      taskId,
      projectId,
      organizationId: orgId,
      userId,
      reaction: normalizedReaction,
    });

    const response = await this.getTaskCommentResponse(
      comment.id,
      taskId,
      projectId,
      orgId,
      userId,
    );
    this.eventEmitter.emit(
      PROJECT_REALTIME_EVENTS.TASK_COMMENT_REACTION_UPDATED,
      {
        ...this.buildRealtimeMeta(projectId, userId),
        taskId,
        comment: response,
      },
    );
    return response;
  }

  private async getTaskCommentResponse(
    commentId: string,
    taskId: string,
    projectId: string,
    orgId: string,
    userId: string,
  ): Promise<TaskCommentResponse> {
    const comment = await this.getTaskCommentEntity(
      commentId,
      taskId,
      projectId,
      orgId,
    );
    const data = await this.buildTaskCommentResponses([comment], userId);
    return data[0];
  }

  private async buildTaskCommentResponses(
    comments: TaskComment[],
    userId: string,
  ): Promise<TaskCommentResponse[]> {
    if (!comments.length) return [];

    const commentIds = comments.map((item) => item.id);
    const [mentions, reactions] = await Promise.all([
      this.taskCommentMentionRepo.find({
        where: { commentId: In(commentIds) },
      }),
      this.taskCommentReactionRepo.find({
        where: { commentId: In(commentIds) },
      }),
    ]);

    const mentionMap = new Map<string, string[]>();
    for (const mention of mentions) {
      const current = mentionMap.get(mention.commentId) ?? [];
      current.push(mention.mentionedUserId);
      mentionMap.set(mention.commentId, current);
    }

    const reactionMap = new Map<
      string,
      Map<string, { reaction: string; count: number; reactedByMe: boolean }>
    >();
    for (const reaction of reactions) {
      const byComment = reactionMap.get(reaction.commentId) ?? new Map();
      const current = byComment.get(reaction.reaction) ?? {
        reaction: reaction.reaction,
        count: 0,
        reactedByMe: false,
      };
      current.count += 1;
      if (reaction.userId === userId) {
        current.reactedByMe = true;
      }
      byComment.set(reaction.reaction, current);
      reactionMap.set(reaction.commentId, byComment);
    }

    return comments.map((comment) => {
      const reactionSummary = [
        ...(reactionMap.get(comment.id)?.values() ?? []),
      ].sort((a, b) => {
        if (
          a.reaction === THUMBS_UP_REACTION &&
          b.reaction !== THUMBS_UP_REACTION
        ) {
          return -1;
        }
        if (
          a.reaction !== THUMBS_UP_REACTION &&
          b.reaction === THUMBS_UP_REACTION
        ) {
          return 1;
        }
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.reaction.localeCompare(b.reaction);
      });

      const thumbsUp = reactionSummary.find(
        (item) => item.reaction === THUMBS_UP_REACTION,
      );

      return plainToInstance(TaskCommentResponse, {
        ...comment,
        mentionUserIds: mentionMap.get(comment.id) ?? [],
        reactions: reactionSummary,
        thumbsUpCount: thumbsUp?.count ?? 0,
        hasThumbsUpByMe: thumbsUp?.reactedByMe ?? false,
      });
    });
  }

  private async resolveValidatedParentCommentId(
    taskId: string,
    projectId: string,
    orgId: string,
    parentCommentId?: string,
  ): Promise<string | undefined> {
    if (!parentCommentId) return undefined;

    const parentComment = await this.taskCommentRepo.findOne({
      where: {
        id: parentCommentId,
        taskId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
      select: { id: true },
    });

    if (!parentComment) {
      throw new BadRequestException(
        'parentCommentId must belong to the same task and be active',
      );
    }

    return parentComment.id;
  }

  private async getTaskCommentEntity(
    commentId: string,
    taskId: string,
    projectId: string,
    orgId: string,
  ): Promise<TaskComment> {
    const comment = await this.taskCommentRepo.findOne({
      where: {
        id: commentId,
        taskId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
    });

    if (!comment) {
      throw new NotFoundException('Task comment not found');
    }

    return comment;
  }

  private normalizeReaction(value: string): string {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
    if (!normalized) {
      throw new BadRequestException('Reaction cannot be empty');
    }
    if (!/^[a-z0-9_+-]{1,64}$/.test(normalized)) {
      throw new BadRequestException(
        'Reaction only supports a-z, 0-9, _, +, - and max length 64',
      );
    }

    return normalized;
  }

  private async validateTaskAssignee(
    projectId: string,
    orgId: string,
    assigneeId?: string,
  ): Promise<void> {
    if (!assigneeId) return;

    await this.projectCoreService.ensureActiveMember(orgId, assigneeId);
    await this.projectCoreService.ensureUserInProject(
      projectId,
      orgId,
      assigneeId,
      {},
    );
  }

  private async getTaskEntity(
    taskId: string,
    projectId: string,
    orgId: string,
  ): Promise<Task> {
    await this.projectCoreService.getProjectEntity(projectId, orgId);

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

  private async ensureCanViewTask(
    task: Task,
    userId: string,
    orgId: string,
  ): Promise<void> {
    const canView = await this.projectCoreService.hasProjectPermission(
      userId,
      orgId,
      task.projectId,
      PERMISSIONS.PROJECTS.TASKS.VIEW,
    );

    if (canView) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to view this task',
    );
  }

  private async ensureCanUpdateTask(
    task: Task,
    userId: string,
    orgId: string,
  ): Promise<void> {
    const canUpdate = await this.projectCoreService.hasProjectPermission(
      userId,
      orgId,
      task.projectId,
      PERMISSIONS.PROJECTS.TASKS.UPDATE,
    );

    if (canUpdate) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to update this task',
    );
  }

  private async ensureCanManageTaskAttachment(
    task: Task,
    userId: string,
    orgId: string,
    permissionCode: string,
    action: 'view' | 'upload' | 'delete',
  ): Promise<void> {
    const hasPermission = await this.projectCoreService.hasProjectPermission(
      userId,
      orgId,
      task.projectId,
      permissionCode,
    );

    if (hasPermission) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to ' + action + ' task attachments',
    );
  }

  private toTaskAttachmentResponse(
    attachment: TaskAttachment,
  ): TaskAttachmentResponse {
    const isLocalFile = this.isLocalAttachmentUrl(attachment.fileUrl);
    const accessUrl = isLocalFile
      ? this.buildTaskAttachmentAccessUrl(
          attachment.projectId,
          attachment.taskId,
          attachment.id,
        )
      : attachment.fileUrl;

    return plainToInstance(TaskAttachmentResponse, {
      ...attachment,
      fileUrl: accessUrl,
      attachmentType: isLocalFile ? 'local_file' : 'web_link',
      accessUrl,
    });
  }

  private buildTaskAttachmentAccessUrl(
    projectId: string,
    taskId: string,
    attachmentId: string,
  ): string {
    return `/api/v1/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/content`;
  }

  private normalizeAttachmentFileName(
    value: string | undefined,
    fallbackName: string,
  ): string {
    const input = (value ?? '').trim();
    const normalized = input
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, ' ')
      .slice(0, 255);

    if (normalized) return normalized;
    return fallbackName;
  }

  private isLocalAttachmentUrl(fileUrl: string): boolean {
    return fileUrl.startsWith(LOCAL_ATTACHMENT_URL_PREFIX);
  }

  private toLocalAttachmentUrl(relativePath: string): string {
    return `${LOCAL_ATTACHMENT_URL_PREFIX}${relativePath}`;
  }

  private resolveLocalRelativePath(fileUrl: string): string {
    if (!this.isLocalAttachmentUrl(fileUrl)) {
      throw new BadRequestException('Attachment is not a local file');
    }

    const relativePath = fileUrl
      .slice(LOCAL_ATTACHMENT_URL_PREFIX.length)
      .replace(/\\/g, '/')
      .trim();

    if (!relativePath || relativePath.includes('..')) {
      throw new BadRequestException('Invalid local attachment path');
    }

    return relativePath;
  }

  private resolveLocalAttachmentAbsolutePath(fileUrl: string): string {
    const relativePath = this.resolveLocalRelativePath(fileUrl);
    const absolutePath = path.resolve(LOCAL_ATTACHMENT_ROOT_DIR, relativePath);
    const normalizedRoot = `${LOCAL_ATTACHMENT_ROOT_DIR}${path.sep}`;
    if (
      absolutePath !== LOCAL_ATTACHMENT_ROOT_DIR &&
      !absolutePath.startsWith(normalizedRoot)
    ) {
      throw new BadRequestException('Invalid local attachment location');
    }

    return absolutePath;
  }

  private async persistLocalAttachmentFile(
    orgId: string,
    projectId: string,
    taskId: string,
    originalFileName: string,
    content: Buffer,
  ): Promise<string> {
    const ext = path.extname(originalFileName).slice(0, 16) || '.bin';
    const storedFileName = `${Date.now()}-${randomUUID()}${ext}`;
    const relativePath = path.posix.join(
      orgId,
      projectId,
      taskId,
      storedFileName,
    );
    const absolutePath = path.resolve(LOCAL_ATTACHMENT_ROOT_DIR, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content);

    return this.toLocalAttachmentUrl(relativePath);
  }

  private async canDeleteLocalAttachmentFile(
    attachmentId: string,
    fileUrl: string,
  ): Promise<boolean> {
    if (!this.isLocalAttachmentUrl(fileUrl)) {
      return false;
    }

    const sharedCount = await this.taskAttachmentRepo.count({
      where: {
        fileUrl,
        id: Not(attachmentId),
      },
    });

    return sharedCount === 0;
  }

  private async deleteLocalAttachmentFile(fileUrl: string): Promise<void> {
    if (!this.isLocalAttachmentUrl(fileUrl)) {
      return;
    }

    const absolutePath = this.resolveLocalAttachmentAbsolutePath(fileUrl);
    try {
      await fs.unlink(absolutePath);
    } catch {
      // Ignore when file is already removed manually.
    }
  }

  private normalizeTagName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private async resolveMentionUserIds(
    dto: CreateTaskCommentRequest,
    project: Project,
    orgId: string,
  ): Promise<string[]> {
    const mentionUserIds = new Set<string>(dto.mentionUserIds ?? []);
    const mentionEmails = this.extractMentionEmails(dto.content);

    if (mentionEmails.length) {
      const lowerEmails = [
        ...new Set(mentionEmails.map((email) => email.toLowerCase())),
      ];
      const users = await this.userRepo
        .createQueryBuilder('u')
        .where('LOWER(u.email) IN (:...emails)', { emails: lowerEmails })
        .getMany();

      const foundEmails = new Set(
        users.map((item) => item.email.toLowerCase()),
      );
      const missingEmails = lowerEmails.filter(
        (email) => !foundEmails.has(email.toLowerCase()),
      );
      if (missingEmails.length) {
        throw new NotFoundException(
          `Mentioned user not found: ${missingEmails.join(', ')}`,
        );
      }

      users.forEach((user) => mentionUserIds.add(user.id));
    }

    const uniqueMentionIds = [...mentionUserIds];
    if (!uniqueMentionIds.length) return uniqueMentionIds;

    const checks = await Promise.all(
      uniqueMentionIds.map((mentionUserId) =>
        this.isProjectParticipant(project.id, orgId, mentionUserId, project),
      ),
    );
    const invalidMentions = uniqueMentionIds.filter((_, idx) => !checks[idx]);
    if (invalidMentions.length) {
      throw new ForbiddenException(
        `Mentioned user is not a member of this project: ${invalidMentions.join(', ')}`,
      );
    }

    return uniqueMentionIds;
  }

  private extractMentionEmails(content: string): string[] {
    const regex = /@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
    const emails: string[] = [];
    let match = regex.exec(content);

    while (match) {
      emails.push(match[1]);
      match = regex.exec(content);
    }

    return [...new Set(emails)];
  }

  private async resolveCommentAuthorRole(
    project: Project,
    task: Task,
    actorId: string,
    orgId: string,
  ): Promise<TaskCommentAuthorRole> {
    if ((project.managerId ?? []).includes(actorId)) {
      return TaskCommentAuthorRole.MANAGER;
    }

    if (task.assignedTo === actorId) {
      return TaskCommentAuthorRole.ASSIGNEE;
    }

    if (await this.isProjectParticipant(project.id, orgId, actorId, project)) {
      // Reuse existing enum to avoid breaking DB enum type.
      return TaskCommentAuthorRole.ASSIGNEE;
    }

    throw new ForbiddenException('Only project members can add comment');
  }

  private async assertCanCommentTask(
    project: Project,
    userId: string,
    orgId: string,
  ): Promise<void> {
    await this.projectCoreService.ensureUserInProject(
      project.id,
      orgId,
      userId,
      { allowOrgAdmin: true },
    );

    const canComment = await this.projectCoreService.hasProjectPermission(
      userId,
      orgId,
      project.id,
      PERMISSIONS.PROJECTS.TASKS.COMMENT,
    );

    if (canComment) return;

    throw new ForbiddenException(
      'Missing permission: ' + PERMISSIONS.PROJECTS.TASKS.COMMENT,
    );
  }

  private async isProjectParticipant(
    projectId: string,
    orgId: string,
    userId: string,
    project?: Project,
  ): Promise<boolean> {
    if (
      project &&
      (project.createdBy === userId ||
        (project.managerId ?? []).includes(userId))
    ) {
      return true;
    }

    const [projectMember, projectScopedRole] = await Promise.all([
      this.projectMemberRepo.findOne({
        where: {
          projectId,
          organizationId: orgId,
          userId,
          isActive: true,
          deletedAt: IsNull(),
        },
      }),
      this.userRoleRepo.findOne({
        where: {
          userId,
          organizationId: orgId,
          scopeType: ScopeType.PROJECT,
          scopeId: projectId,
        },
      }),
    ]);

    return !!projectMember || !!projectScopedRole;
  }

  private async resolveValidatedParentTaskId(
    projectId: string,
    orgId: string,
    parentTaskId?: string | null,
    currentTaskId?: string,
  ): Promise<string | null | undefined> {
    if (parentTaskId === undefined) {
      return undefined;
    }

    if (parentTaskId === null) {
      return null;
    }

    if (currentTaskId && currentTaskId === parentTaskId) {
      throw new BadRequestException('Task cannot be parent of itself');
    }

    const parentTask = await this.taskRepo.findOne({
      where: {
        id: parentTaskId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
      select: { id: true, parentTaskId: true },
    });

    if (!parentTask) {
      throw new BadRequestException(
        'parentTaskId must belong to the same project and be active',
      );
    }

    if (currentTaskId) {
      await this.assertNoParentCycle(
        projectId,
        orgId,
        currentTaskId,
        parentTaskId,
      );
    }

    return parentTaskId;
  }

  private async assertNoParentCycle(
    projectId: string,
    orgId: string,
    currentTaskId: string,
    parentTaskId: string,
  ): Promise<void> {
    const visited = new Set<string>();
    let cursor: string | null | undefined = parentTaskId;

    while (cursor) {
      if (cursor === currentTaskId) {
        throw new BadRequestException(
          'Cannot create cyclic parent-child task relation',
        );
      }

      if (visited.has(cursor)) {
        throw new BadRequestException('Invalid task hierarchy detected');
      }

      visited.add(cursor);

      const node = await this.taskRepo.findOne({
        where: {
          id: cursor,
          projectId,
          organizationId: orgId,
          deletedAt: IsNull(),
        },
        select: { id: true, parentTaskId: true },
      });

      if (!node) {
        break;
      }

      cursor = node.parentTaskId;
    }
  }

  private async resolveActiveStatusId(
    projectId: string,
    orgId: string,
    statusId?: string,
  ): Promise<string | undefined> {
    if (!statusId) return undefined;
    const status = await this.getActiveStatusEntity(projectId, orgId, statusId);
    return status.id;
  }

  private async resolveDefaultStatusId(
    projectId: string,
    orgId: string,
  ): Promise<string | undefined> {
    await this.projectCoreService.ensureDefaultTaskStatuses(projectId, orgId);

    const defaultStatus = await this.statusTaskRepo.findOne({
      where: {
        projectId,
        organizationId: orgId,
        isDefault: true,
        deletedAt: IsNull(),
      },
      order: { orderIndex: 'ASC' },
    });

    if (defaultStatus) return defaultStatus.id;

    const firstStatus = await this.statusTaskRepo.findOne({
      where: { projectId, organizationId: orgId, deletedAt: IsNull() },
      order: { orderIndex: 'ASC', createdAt: 'ASC' },
    });

    return firstStatus?.id;
  }

  private async getActiveStatusEntity(
    projectId: string,
    orgId: string,
    statusId: string,
  ): Promise<StatusTask> {
    const status = await this.statusTaskRepo.findOne({
      where: {
        id: statusId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
    });

    if (!status) {
      throw new BadRequestException(
        'statusId is invalid or status has been deleted in this project',
      );
    }

    return status;
  }

  private async resolveStatusNameById(
    projectId: string,
    orgId: string,
    statusId?: string,
  ): Promise<string | undefined> {
    if (!statusId) return undefined;

    const status = await this.statusTaskRepo.findOne({
      where: {
        id: statusId,
        projectId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
      select: { id: true, name: true },
    });

    return status?.name;
  }

  private async toTaskResponses(tasks: Task[]): Promise<TaskResponse[]> {
    if (!tasks.length) return [];

    const statusIds = [
      ...new Set(
        tasks.map((task) => task.statusId).filter(Boolean) as string[],
      ),
    ];

    const statuses =
      statusIds.length > 0
        ? await this.statusTaskRepo.find({
            where: {
              id: In(statusIds),
              projectId: tasks[0].projectId,
              organizationId: tasks[0].organizationId,
              deletedAt: IsNull(),
            },
            select: { id: true, name: true },
          })
        : [];
    const statusNameById = new Map(
      statuses.map((item) => [item.id, item.name]),
    );

    return tasks.map((task) => {
      const status = this.resolveTaskStatusLabelSync(task, statusNameById);
      return plainToInstance(TaskResponse, {
        ...task,
        status,
        dueState: this.resolveTaskDueState(task, status),
      });
    });
  }

  private async toTaskResponse(task: Task): Promise<TaskResponse> {
    const status = await this.resolveTaskStatusLabel(task);

    return plainToInstance(TaskResponse, {
      ...task,
      status,
      dueState: this.resolveTaskDueState(task, status),
    });
  }

  private async resolveTaskStatusLabel(task: Task): Promise<string> {
    const statusName = await this.resolveStatusNameById(
      task.projectId,
      task.organizationId,
      task.statusId,
    );

    if (statusName) return statusName;
    return 'Unknown';
  }

  private resolveTaskStatusLabelSync(
    task: Task,
    statusNameById: Map<string, string>,
  ): string {
    if (task.statusId) {
      const statusName = statusNameById.get(task.statusId);
      if (statusName) return statusName;
    }

    return 'Unknown';
  }

  private isDoneStatusName(name?: string): boolean {
    return this.normalizeStatusName(name) === 'done';
  }

  private normalizeStatusName(name?: string): string {
    return (name ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  }

  private validateTaskTimeline(
    startedAt?: Date | string,
    dueDate?: Date | string,
    completedAt?: Date | string,
    actualStart?: Date | string,
    actualEnd?: Date | string,
  ): void {
    const started = this.toDateOrUndefined(startedAt);
    const due = this.toDateOrUndefined(dueDate);
    const completed = this.toDateOrUndefined(completedAt);
    const actualStarted = this.toDateOrUndefined(actualStart);
    const actualCompleted = this.toDateOrUndefined(actualEnd);

    if (started && due && started.getTime() > due.getTime()) {
      throw new BadRequestException('startedAt cannot be later than dueDate');
    }

    if (completed && started && completed.getTime() < started.getTime()) {
      throw new BadRequestException(
        'completedAt cannot be earlier than startedAt',
      );
    }

    if (actualStarted && due && actualStarted.getTime() > due.getTime()) {
      throw new BadRequestException('actualStart cannot be later than dueDate');
    }

    if (
      actualCompleted &&
      actualStarted &&
      actualCompleted.getTime() < actualStarted.getTime()
    ) {
      throw new BadRequestException(
        'actualEnd cannot be earlier than actualStart',
      );
    }
  }

  private validateTaskDueState(value?: TaskDueState): void {
    if (!value) return;
    if (!Object.values(TaskDueState).includes(value)) {
      throw new BadRequestException(
        `dueState must be one of: ${Object.values(TaskDueState).join(', ')}`,
      );
    }
  }

  private applyTaskDueStateFilter(
    query: SelectQueryBuilder<Task>,
    dueState: TaskDueState,
  ): void {
    const doneStatusCondition =
      "LOWER(REGEXP_REPLACE(COALESCE(status.name, ''), '\\s+', '_', 'g')) = :doneStatus";
    const doneStatusParams = { doneStatus: 'done' };
    const now = new Date();
    const dueSoonAt = new Date(now.getTime() + TASK_DUE_SOON_WINDOW_MS);

    if (dueState === TaskDueState.NO_DUE_DATE) {
      query.andWhere('task.due_date IS NULL');
      return;
    }

    if (dueState === TaskDueState.DONE_ON_TIME) {
      query
        .andWhere(doneStatusCondition, doneStatusParams)
        .andWhere('task.due_date IS NOT NULL')
        .andWhere('task.completed_at IS NOT NULL')
        .andWhere(buildTaskDoneOnTimeSql());
      return;
    }

    if (dueState === TaskDueState.DONE_LATE) {
      query
        .andWhere(doneStatusCondition, doneStatusParams)
        .andWhere('task.due_date IS NOT NULL')
        .andWhere('task.completed_at IS NOT NULL')
        .andWhere(buildTaskDoneLateSql());
      return;
    }

    if (dueState === TaskDueState.OVERDUE) {
      query
        .andWhere(`NOT (${doneStatusCondition})`, doneStatusParams)
        .andWhere('task.due_date IS NOT NULL')
        .andWhere(buildTaskDuePassedSql(), { now });
      return;
    }

    if (dueState === TaskDueState.DUE_SOON) {
      query
        .andWhere(`NOT (${doneStatusCondition})`, doneStatusParams)
        .andWhere('task.due_date IS NOT NULL')
        .andWhere(buildTaskDueSoonSql(), { now, dueSoonAt });
      return;
    }

    if (dueState === TaskDueState.ON_TRACK) {
      query
        .andWhere(`NOT (${doneStatusCondition})`, doneStatusParams)
        .andWhere('task.due_date IS NOT NULL')
        .andWhere(buildTaskDueAfterSql(), { dueSoonAt });
      return;
    }
  }

  private resolveTaskDueState(task: Task, statusName?: string): TaskDueState {
    const dueDate = this.toDateOrUndefined(task.dueDate);
    if (!dueDate) {
      return TaskDueState.NO_DUE_DATE;
    }

    const isDone = this.isDoneStatusName(statusName);
    const completedAt = this.toDateOrUndefined(task.completedAt);
    if (isDone) {
      if (completedAt && !isTaskCompletedOnTime(completedAt, dueDate)) {
        return TaskDueState.DONE_LATE;
      }
      return TaskDueState.DONE_ON_TIME;
    }

    const now = Date.now();

    if (isTaskDuePassed(dueDate, now)) {
      return TaskDueState.OVERDUE;
    }

    if (
      resolveTaskDueCutoff(dueDate).getTime() <=
      now + TASK_DUE_SOON_WINDOW_MS
    ) {
      return TaskDueState.DUE_SOON;
    }

    return TaskDueState.ON_TRACK;
  }

  private toDateOrUndefined(value?: Date | string | null): Date | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (value instanceof Date)
      return Number.isNaN(value.getTime()) ? undefined : value;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid datetime value');
    }
    return parsed;
  }

  private async generateTaskSlug(project: Project): Promise<string> {
    const prefix = this.resolveTaskPrefix(project);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const sequence = await this.reserveNextTaskSequence(
        project.id,
        project.organizationId,
      );
      const slug = `${prefix}-${sequence}`;

      const exists = await this.taskRepo.findOne({
        where: { slug },
        withDeleted: true,
        select: { id: true },
      });

      if (!exists) {
        return slug;
      }
    }

    throw new ConflictException('Cannot generate unique task slug');
  }

  private async reserveNextTaskSequence(
    projectId: string,
    organizationId: string,
  ): Promise<number> {
    return this.taskRepo.manager.transaction(async (manager) => {
      const counterRepo = manager.getRepository(TaskSlugCounter);

      let counter = await counterRepo
        .createQueryBuilder('counter')
        .setLock('pessimistic_write')
        .where('counter.project_id = :projectId', { projectId })
        .getOne();

      if (!counter) {
        try {
          counter = await counterRepo.save(
            counterRepo.create({
              projectId,
              organizationId,
              nextValue: 1,
            }),
          );
        } catch {
          counter = await counterRepo
            .createQueryBuilder('counter')
            .setLock('pessimistic_write')
            .where('counter.project_id = :projectId', { projectId })
            .getOne();

          if (!counter) {
            throw new ConflictException('Cannot initialize task slug counter');
          }
        }
      }

      const sequence = counter.nextValue;
      counter.nextValue = sequence + 1;
      await counterRepo.save(counter);
      return sequence;
    });
  }

  private resolveTaskPrefix(project: Project): string {
    const base = project.slug ?? project.name;
    const normalized = this.normalizePrefix(base);
    return normalized ?? 'TASK';
  }

  private normalizePrefix(input?: string): string | undefined {
    if (!input) return undefined;
    const normalized = input
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 12);
    return normalized || undefined;
  }

  private buildRealtimeMeta(
    projectId: string,
    actorUserId: string,
  ): {
    projectId: string;
    actorUserId: string;
    occurredAt: string;
  } {
    return {
      projectId,
      actorUserId,
      occurredAt: new Date().toISOString(),
    };
  }

  private async collectActiveTaskTree(
    root: Task,
    manager: EntityManager,
  ): Promise<Task[]> {
    const result: Task[] = [root];
    const seenTaskIds = new Set<string>([root.id]);
    let parentIds = [root.id];

    while (parentIds.length) {
      const children = await manager.find(Task, {
        where: {
          projectId: root.projectId,
          organizationId: root.organizationId,
          parentTaskId: In(parentIds),
          deletedAt: IsNull(),
        },
      });
      const nextParentIds: string[] = [];

      for (const child of children) {
        if (seenTaskIds.has(child.id)) continue;
        seenTaskIds.add(child.id);
        result.push(child);
        nextParentIds.push(child.id);
      }

      parentIds = nextParentIds;
    }

    return result;
  }

  private async createTaskHistory(params: {
    task: Task;
    action: TaskHistoryAction;
    actorId: string;
    fromValue?: string;
    toValue?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const actorDisplayName = await this.getActorDisplayName(params.actorId);

    const history = this.taskHistoryRepo.create({
      taskId: params.task.id,
      projectId: params.task.projectId,
      organizationId: params.task.organizationId,
      action: params.action,
      fromValue: params.fromValue,
      toValue: params.toValue,
      metadata: params.metadata,
      actorId: params.actorId,
      actorDisplayName,
    });

    await this.taskHistoryRepo.save(history);
  }

  private async getActorDisplayName(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return userId;

    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (fullName) return fullName;
    return user.email || userId;
  }

  private toRelativeTime(value: Date): string {
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - new Date(value).getTime());
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const minutes = Math.max(1, Math.floor(diffMs / minute));
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    if (diffMs < day) {
      const hours = Math.max(1, Math.floor(diffMs / hour));
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    const days = Math.max(1, Math.floor(diffMs / day));
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}
