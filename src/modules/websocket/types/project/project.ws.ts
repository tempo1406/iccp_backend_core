import type { ProjectInviteResponse } from '@modules/project/core/dto/response/project-invite.response';
import type { ProjectResponse } from '@modules/project/core/dto/response/project.response';
import type { ProjectMemberResponse } from '@modules/project/project-member/dto/response/project-member.response';
import type { ProjectRoleDetailResponse } from '@modules/project/role-manage/dto/response/project-role-detail.response';
import type { StatusTaskResponse } from '@modules/project/status-task/dto/response/status-task.response';
import type { TaskAttachmentResponse } from '@modules/project/task-management/dto/response/task-attachment.response';
import type { TaskCommentResponse } from '@modules/project/task-management/dto/response/task-comment.response';
import type { TaskResponse } from '@modules/project/task-management/dto/response/task.response';
import type { TaskTagResponse } from '@modules/project/task-management/dto/response/task-tag.response';

export interface ProjectRealtimeBaseWsPayload {
  projectId: string;
  actorUserId: string;
  occurredAt: string;
}

export interface ProjectUpdatedWsPayload extends ProjectRealtimeBaseWsPayload {
  project: ProjectResponse;
}

export interface ProjectTaskWsPayload extends ProjectRealtimeBaseWsPayload {
  task: TaskResponse;
}

export interface ProjectTaskDeletedWsPayload extends ProjectRealtimeBaseWsPayload {
  taskId: string;
}

export interface ProjectTaskCommentWsPayload
  extends ProjectRealtimeBaseWsPayload {
  taskId: string;
  comment: TaskCommentResponse;
}

export interface ProjectTaskTagWsPayload extends ProjectRealtimeBaseWsPayload {
  taskId: string;
  tag: TaskTagResponse;
}

export interface ProjectTaskAttachmentWsPayload
  extends ProjectRealtimeBaseWsPayload {
  taskId: string;
  attachment: TaskAttachmentResponse;
}

export interface ProjectStatusListWsPayload
  extends ProjectRealtimeBaseWsPayload {
  statuses: StatusTaskResponse[];
  deletedStatusId?: string;
}

export interface ProjectMemberInviteWsPayload
  extends ProjectRealtimeBaseWsPayload {
  invite: ProjectInviteResponse;
}

export interface ProjectMemberWsPayload extends ProjectRealtimeBaseWsPayload {
  member: ProjectMemberResponse;
}

export interface ProjectMemberRemovedWsPayload
  extends ProjectRealtimeBaseWsPayload {
  memberId: string;
  userId: string;
}

export interface ProjectRoleWsPayload extends ProjectRealtimeBaseWsPayload {
  role: ProjectRoleDetailResponse;
}

export interface ProjectRoleDeletedWsPayload
  extends ProjectRealtimeBaseWsPayload {
  roleId: string;
}

export interface ProjectRoleMemberAssignmentWsPayload
  extends ProjectRealtimeBaseWsPayload {
  userId: string;
  roleIds: string[];
}
