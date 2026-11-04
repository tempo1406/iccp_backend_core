import { ProjectInviteRole } from '../../core/entities/project-invite.entity';

export const PROJECT_NOTIFICATION_EVENTS = {
  INVITE_CREATED: 'project.notification.invite_created',
  TASK_ASSIGNED: 'project.notification.task_assigned',
  TASK_REASSIGNED: 'project.notification.task_reassigned',
  TASK_MENTIONED: 'project.notification.task_mentioned',
  TASK_STATUS_CHANGED: 'project.notification.task_status_changed',
  MEMBER_ROLE_CHANGED: 'project.notification.member_role_changed',
  MEMBER_REMOVED: 'project.notification.member_removed',
} as const;

export const PROJECT_NOTIFICATION_TYPES = {
  INVITE: 'project_invite',
  TASK_ASSIGNED: 'task_assigned',
  TASK_REASSIGNED: 'task_reassigned',
  TASK_MENTIONED: 'task_mentioned',
  TASK_STATUS_CHANGED: 'task_status_changed',
  MEMBER_ROLE_CHANGED: 'project_role_changed',
  MEMBER_REMOVED: 'project_member_removed',
  TASK_DUE_SOON: 'task_due_soon',
  TASK_OVERDUE: 'task_overdue',
} as const;

interface ProjectNotificationBaseEvent {
  projectId: string;
  organizationId: string;
  actorUserId: string;
  occurredAt: string;
}

export interface ProjectInviteCreatedNotificationEvent
  extends ProjectNotificationBaseEvent {
  inviteId: string;
  inviteeUserId: string;
  role: ProjectInviteRole;
}

export interface ProjectTaskAssignedNotificationEvent
  extends ProjectNotificationBaseEvent {
  taskId: string;
  assigneeUserId: string;
}

export interface ProjectTaskReassignedNotificationEvent
  extends ProjectNotificationBaseEvent {
  taskId: string;
  previousAssigneeUserId: string;
  nextAssigneeUserId: string;
}

export interface ProjectTaskMentionedNotificationEvent
  extends ProjectNotificationBaseEvent {
  taskId: string;
  commentId: string;
  mentionedUserIds: string[];
}

export interface ProjectTaskStatusChangedNotificationEvent
  extends ProjectNotificationBaseEvent {
  taskId: string;
  assigneeUserId: string;
  fromStatus?: string;
  toStatus?: string;
}

export interface ProjectMemberRoleChangedNotificationEvent
  extends ProjectNotificationBaseEvent {
  targetUserId: string;
  changeType: 'assigned' | 'revoked' | 'replaced';
  roleId?: string;
  previousRoleId?: string;
}

export interface ProjectMemberRemovedNotificationEvent
  extends ProjectNotificationBaseEvent {
  targetUserId: string;
}
