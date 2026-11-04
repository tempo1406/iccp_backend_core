import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { Notification } from '@modules/notification/core/entities/notification.entity';
import { User } from '@modules/users/entities/user.entity';
import { Task } from '../task-management/entities/task.entity';
import { Project } from '../core/entities/project.entity';
import {
  ProjectInvite,
  ProjectInviteRole,
} from '../core/entities/project-invite.entity';
import { Role } from '@modules/rbac/entities/role.entity';
import {
  PROJECT_NOTIFICATION_EVENTS,
  PROJECT_NOTIFICATION_TYPES,
  ProjectInviteCreatedNotificationEvent,
  ProjectMemberRemovedNotificationEvent,
  ProjectMemberRoleChangedNotificationEvent,
  ProjectTaskAssignedNotificationEvent,
  ProjectTaskMentionedNotificationEvent,
  ProjectTaskReassignedNotificationEvent,
  ProjectTaskStatusChangedNotificationEvent,
} from './constants/project-notification-events.constant';

type SenderMeta = {
  senderId?: string;
  senderName?: string;
  senderAvatarUrl?: string;
};

@Injectable()
export class ProjectNotificationListener {
  private readonly logger = new Logger(ProjectNotificationListener.name);
  constructor(
    private readonly notificationCoreService: NotificationCoreService,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(ProjectInvite)
    private readonly projectInviteRepo: Repository<ProjectInvite>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  @OnEvent(PROJECT_NOTIFICATION_EVENTS.INVITE_CREATED)
  async handleInviteCreated(
    event: ProjectInviteCreatedNotificationEvent,
  ): Promise<void> {
    if (event.inviteeUserId === event.actorUserId) return;

    const [project, invite, sender] = await Promise.all([
      this.getProject(event.projectId, event.organizationId),
      this.projectInviteRepo.findOne({
        where: {
          id: event.inviteId,
          projectId: event.projectId,
          organizationId: event.organizationId,
          deletedAt: IsNull(),
        },
      }),
      this.getUser(event.actorUserId),
    ]);
    if (!project || !invite) return;

    const roleLabel = event.role === ProjectInviteRole.PM ? 'PM' : 'member';
    const senderMeta = this.toSenderMeta(sender);
    const senderName = senderMeta.senderName ?? 'Someone';

    await this.notificationCoreService.send({
      userId: event.inviteeUserId,
      senderId: senderMeta.senderId,
      senderName: senderMeta.senderName,
      senderAvatarUrl: senderMeta.senderAvatarUrl,
      type: PROJECT_NOTIFICATION_TYPES.INVITE,
      title: `${senderName} invited you to project ${project.name}`,
      message: `You were invited to join project ${project.name} as ${roleLabel}.`,
      data: {
        organizationId: event.organizationId,
        orgId: event.organizationId,
        module: 'project',
        action: PROJECT_NOTIFICATION_TYPES.INVITE,
        projectId: project.id,
        projectSlug: project.slug,
        inviteId: invite.id,
        inviteRole: invite.role,
        token: invite.token ?? null,
        expiresAt: invite.expiresAt?.toISOString() ?? null,
      },
    });
  }

  @OnEvent(PROJECT_NOTIFICATION_EVENTS.TASK_ASSIGNED)
  async handleTaskAssigned(
    event: ProjectTaskAssignedNotificationEvent,
  ): Promise<void> {
    if (event.assigneeUserId === event.actorUserId) return;

    const [project, task, sender] = await Promise.all([
      this.getProject(event.projectId, event.organizationId),
      this.getTask(event.taskId, event.projectId, event.organizationId),
      this.getUser(event.actorUserId),
    ]);
    if (!project || !task?.assignedTo) return;

    const senderMeta = this.toSenderMeta(sender);
    const senderName = senderMeta.senderName ?? 'Someone';

    await this.notificationCoreService.send({
      userId: event.assigneeUserId,
      senderId: senderMeta.senderId,
      senderName: senderMeta.senderName,
      senderAvatarUrl: senderMeta.senderAvatarUrl,
      type: PROJECT_NOTIFICATION_TYPES.TASK_ASSIGNED,
      title: `You were assigned task "${task.title}"`,
      message: `${senderName} assigned task "${task.title}" to you in project ${project.name}.`,
      data: {
        module: 'project',
        action: PROJECT_NOTIFICATION_TYPES.TASK_ASSIGNED,
        projectId: project.id,
        projectSlug: project.slug,
        taskId: task.id,
        taskSlug: task.slug ?? null,
      },
    });
  }

  @OnEvent(PROJECT_NOTIFICATION_EVENTS.TASK_REASSIGNED)
  async handleTaskReassigned(
    event: ProjectTaskReassignedNotificationEvent,
  ): Promise<void> {
    const [project, task, sender] = await Promise.all([
      this.getProject(event.projectId, event.organizationId),
      this.getTask(event.taskId, event.projectId, event.organizationId),
      this.getUser(event.actorUserId),
    ]);
    if (!project || !task) return;

    const senderMeta = this.toSenderMeta(sender);
    const senderName = senderMeta.senderName ?? 'Someone';

    if (
      event.previousAssigneeUserId &&
      event.previousAssigneeUserId !== event.actorUserId
    ) {
      await this.notificationCoreService.send({
        userId: event.previousAssigneeUserId,
        senderId: senderMeta.senderId,
        senderName: senderMeta.senderName,
        senderAvatarUrl: senderMeta.senderAvatarUrl,
        type: PROJECT_NOTIFICATION_TYPES.TASK_REASSIGNED,
        title: `Task "${task.title}" was reassigned`,
        message: `${senderName} reassigned task "${task.title}" to someone else in project ${project.name}.`,
        data: {
          module: 'project',
          action: 'task_reassigned_from_you',
          projectId: project.id,
          projectSlug: project.slug,
          taskId: task.id,
          taskSlug: task.slug ?? null,
          previousAssigneeUserId: event.previousAssigneeUserId,
          nextAssigneeUserId: event.nextAssigneeUserId,
        },
      });
    }

    if (event.nextAssigneeUserId !== event.actorUserId) {
      await this.notificationCoreService.send({
        userId: event.nextAssigneeUserId,
        senderId: senderMeta.senderId,
        senderName: senderMeta.senderName,
        senderAvatarUrl: senderMeta.senderAvatarUrl,
        type: PROJECT_NOTIFICATION_TYPES.TASK_REASSIGNED,
        title: `Task "${task.title}" was reassigned to you`,
        message: `${senderName} reassigned task "${task.title}" to you in project ${project.name}.`,
        data: {
          module: 'project',
          action: 'task_reassigned_to_you',
          projectId: project.id,
          projectSlug: project.slug,
          taskId: task.id,
          taskSlug: task.slug ?? null,
          previousAssigneeUserId: event.previousAssigneeUserId,
          nextAssigneeUserId: event.nextAssigneeUserId,
        },
      });
    }
  }

  @OnEvent(PROJECT_NOTIFICATION_EVENTS.TASK_MENTIONED)
  async handleTaskMentioned(
    event: ProjectTaskMentionedNotificationEvent,
  ): Promise<void> {
    const [project, task, sender] = await Promise.all([
      this.getProject(event.projectId, event.organizationId),
      this.getTask(event.taskId, event.projectId, event.organizationId),
      this.getUser(event.actorUserId),
    ]);
    if (!project || !task) return;

    const senderMeta = this.toSenderMeta(sender);
    const senderName = senderMeta.senderName ?? 'Someone';

    for (const mentionedUserId of [...new Set(event.mentionedUserIds)]) {
      if (mentionedUserId === event.actorUserId) continue;

      await this.notificationCoreService.send({
        userId: mentionedUserId,
        senderId: senderMeta.senderId,
        senderName: senderMeta.senderName,
        senderAvatarUrl: senderMeta.senderAvatarUrl,
        type: PROJECT_NOTIFICATION_TYPES.TASK_MENTIONED,
        title: `You were mentioned in task "${task.title}"`,
        message: `${senderName} mentioned you in a comment on task "${task.title}" in project ${project.name}.`,
        data: {
          module: 'project',
          action: PROJECT_NOTIFICATION_TYPES.TASK_MENTIONED,
          projectId: project.id,
          projectSlug: project.slug,
          taskId: task.id,
          taskSlug: task.slug ?? null,
          commentId: event.commentId,
        },
      });
    }
  }

  @OnEvent(PROJECT_NOTIFICATION_EVENTS.TASK_STATUS_CHANGED)
  async handleTaskStatusChanged(
    event: ProjectTaskStatusChangedNotificationEvent,
  ): Promise<void> {
    if (event.assigneeUserId === event.actorUserId) return;

    const [project, task, sender] = await Promise.all([
      this.getProject(event.projectId, event.organizationId),
      this.getTask(event.taskId, event.projectId, event.organizationId),
      this.getUser(event.actorUserId),
    ]);
    if (!project || !task) return;

    const senderMeta = this.toSenderMeta(sender);
    const senderName = senderMeta.senderName ?? 'Someone';

    await this.notificationCoreService.send({
      userId: event.assigneeUserId,
      senderId: senderMeta.senderId,
      senderName: senderMeta.senderName,
      senderAvatarUrl: senderMeta.senderAvatarUrl,
      type: PROJECT_NOTIFICATION_TYPES.TASK_STATUS_CHANGED,
      title: `Task "${task.title}" status changed`,
      message: `${senderName} changed task "${task.title}" status from "${event.fromStatus ?? 'Unknown'}" to "${event.toStatus ?? 'Unknown'}".`,
      data: {
        module: 'project',
        action: PROJECT_NOTIFICATION_TYPES.TASK_STATUS_CHANGED,
        projectId: project.id,
        projectSlug: project.slug,
        taskId: task.id,
        taskSlug: task.slug ?? null,
        fromStatus: event.fromStatus ?? null,
        toStatus: event.toStatus ?? null,
      },
    });
  }

  @OnEvent(PROJECT_NOTIFICATION_EVENTS.MEMBER_ROLE_CHANGED)
  async handleMemberRoleChanged(
    event: ProjectMemberRoleChangedNotificationEvent,
  ): Promise<void> {
    if (event.targetUserId === event.actorUserId) return;

    const [project, sender, role, previousRole] = await Promise.all([
      this.getProject(event.projectId, event.organizationId),
      this.getUser(event.actorUserId),
      event.roleId ? this.getRole(event.roleId) : Promise.resolve(null),
      event.previousRoleId
        ? this.getRole(event.previousRoleId)
        : Promise.resolve(null),
    ]);
    if (!project) return;

    const senderMeta = this.toSenderMeta(sender);
    const senderName = senderMeta.senderName ?? 'Someone';

    const roleName = role?.name ?? 'new role';
    const previousRoleName = previousRole?.name ?? 'previous role';

    let title = `Your role in project ${project.name} has changed`;
    let message = `${senderName} updated your role in project ${project.name}.`;

    if (event.changeType === 'replaced') {
      title = `Your role in project ${project.name} was changed`;
      message = `${senderName} changed your role from "${previousRoleName}" to "${roleName}".`;
    } else if (event.changeType === 'assigned') {
      title = `You were assigned an additional role in project ${project.name}`;
      message = `${senderName} assigned you the role "${roleName}" in project ${project.name}.`;
    } else if (event.changeType === 'revoked') {
      title = `One of your roles in project ${project.name} was revoked`;
      message = `${senderName} revoked your role "${roleName}" in project ${project.name}.`;
    }

    await this.notificationCoreService.send({
      userId: event.targetUserId,
      senderId: senderMeta.senderId,
      senderName: senderMeta.senderName,
      senderAvatarUrl: senderMeta.senderAvatarUrl,
      type: PROJECT_NOTIFICATION_TYPES.MEMBER_ROLE_CHANGED,
      title,
      message,
      data: {
        module: 'project',
        action: PROJECT_NOTIFICATION_TYPES.MEMBER_ROLE_CHANGED,
        projectId: project.id,
        projectSlug: project.slug,
        changeType: event.changeType,
        roleId: event.roleId ?? null,
        roleName,
        previousRoleId: event.previousRoleId ?? null,
        previousRoleName,
      },
    });
  }

  @OnEvent(PROJECT_NOTIFICATION_EVENTS.MEMBER_REMOVED)
  async handleMemberRemoved(
    event: ProjectMemberRemovedNotificationEvent,
  ): Promise<void> {
    if (event.targetUserId === event.actorUserId) return;

    const [project, sender] = await Promise.all([
      this.getProject(event.projectId, event.organizationId),
      this.getUser(event.actorUserId),
    ]);
    if (!project) return;

    const senderMeta = this.toSenderMeta(sender);
    const senderName = senderMeta.senderName ?? 'Someone';

    await this.notificationCoreService.send({
      userId: event.targetUserId,
      senderId: senderMeta.senderId,
      senderName: senderMeta.senderName,
      senderAvatarUrl: senderMeta.senderAvatarUrl,
      type: PROJECT_NOTIFICATION_TYPES.MEMBER_REMOVED,
      title: `You were removed from project ${project.name}`,
      message: `${senderName} removed you from project ${project.name}.`,
      data: {
        module: 'project',
        action: PROJECT_NOTIFICATION_TYPES.MEMBER_REMOVED,
        projectId: project.id,
        projectSlug: project.slug,
      },
    });
  }

  async sendDeadlineNotification(params: {
    userId: string;
    type:
      | typeof PROJECT_NOTIFICATION_TYPES.TASK_DUE_SOON
      | typeof PROJECT_NOTIFICATION_TYPES.TASK_OVERDUE;
    taskId: string;
    dueDate: string;
  }): Promise<void> {
    const [task, user] = await Promise.all([
      this.taskRepo.findOne({
        where: {
          id: params.taskId,
          assignedTo: params.userId,
          deletedAt: IsNull(),
        },
      }),
      this.getUser(params.userId),
    ]);
    if (!task) return;

    const project = await this.getProject(task.projectId, task.organizationId);
    if (!project) return;

    const dueDateLabel = new Date(params.dueDate).toISOString();
    const title =
      params.type === PROJECT_NOTIFICATION_TYPES.TASK_DUE_SOON
        ? `Task "${task.title}" is due soon`
        : `Task "${task.title}" is overdue`;
    const message =
      params.type === PROJECT_NOTIFICATION_TYPES.TASK_DUE_SOON
        ? `Task "${task.title}" in project ${project.name} is due on ${dueDateLabel}.`
        : `Task "${task.title}" in project ${project.name} has been overdue since ${dueDateLabel}.`;

    const idempotencyKey = `deadline:${params.type}:${params.taskId}:${params.dueDate}`;

    await this.notificationCoreService.send({
      userId: params.userId,
      senderName: 'System',
      type: params.type,
      title,
      message,
      idempotencyKey,
      data: {
        module: 'project',
        action: params.type,
        projectId: project.id,
        projectSlug: project.slug,
        taskId: task.id,
        taskSlug: task.slug ?? null,
        dueDate: params.dueDate,
        assigneeEmail: user?.email ?? null,
      },
    });
  }

  private async getUser(userId?: string): Promise<User | null> {
    if (!userId) return null;
    return this.userRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
    });
  }

  private async getProject(
    projectId: string,
    organizationId: string,
  ): Promise<Project | null> {
    return this.projectRepo.findOne({
      where: { id: projectId, organizationId, deletedAt: IsNull() },
    });
  }

  private async getTask(
    taskId: string,
    projectId: string,
    organizationId: string,
  ): Promise<Task | null> {
    return this.taskRepo.findOne({
      where: { id: taskId, projectId, organizationId, deletedAt: IsNull() },
    });
  }

  private async getRole(roleId: string): Promise<Role | null> {
    return this.roleRepo.findOne({
      where: { id: roleId },
    });
  }

  private toSenderMeta(sender: User | null): SenderMeta {
    if (!sender) return {};

    const senderName =
      [sender.firstName, sender.lastName].filter(Boolean).join(' ').trim() ||
      sender.email;

    return {
      senderId: sender.id,
      senderName,
      senderAvatarUrl: sender.avatarUrl,
    };
  }
}

