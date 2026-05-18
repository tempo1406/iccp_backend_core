import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WsEvent, WsEventPayloadMap, WsEvents } from '@modules/websocket/types';
import {
  ProjectMemberInviteWsPayload,
  ProjectMemberRemovedWsPayload,
  ProjectMemberWsPayload,
  ProjectRoleDeletedWsPayload,
  ProjectRoleMemberAssignmentWsPayload,
  ProjectRoleWsPayload,
  ProjectStatusListWsPayload,
  ProjectTaskAttachmentWsPayload,
  ProjectTaskCommentWsPayload,
  ProjectTaskDeletedWsPayload,
  ProjectTaskTagWsPayload,
  ProjectTaskWsPayload,
  ProjectUpdatedWsPayload,
} from '@modules/websocket/types/project/project.ws';
import { PROJECT_REALTIME_EVENTS } from './constants/project-realtime-events.constant';
import { ProjectRealtimeSocketService } from './project-realtime-socket.service';

@Injectable()
export class ProjectRealtimeListener {
  constructor(
    private readonly projectRealtimeSocketService: ProjectRealtimeSocketService,
  ) {}

  @OnEvent(PROJECT_REALTIME_EVENTS.PROJECT_UPDATED)
  handleProjectUpdated(payload: ProjectUpdatedWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_UPDATED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.TASK_CREATED)
  handleTaskCreated(payload: ProjectTaskWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_TASK_CREATED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.TASK_UPDATED)
  handleTaskUpdated(payload: ProjectTaskWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_TASK_UPDATED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.TASK_DELETED)
  handleTaskDeleted(payload: ProjectTaskDeletedWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_TASK_DELETED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.TASK_STATUS_CHANGED)
  handleTaskStatusChanged(payload: ProjectTaskWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_TASK_STATUS_CHANGED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.TASK_COMMENT_CREATED)
  handleTaskCommentCreated(payload: ProjectTaskCommentWsPayload): void {
    this.emit(
      payload.projectId,
      WsEvents.PROJECT_TASK_COMMENT_CREATED,
      payload,
    );
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.TASK_COMMENT_REACTION_UPDATED)
  handleTaskCommentReactionUpdated(payload: ProjectTaskCommentWsPayload): void {
    this.emit(
      payload.projectId,
      WsEvents.PROJECT_TASK_COMMENT_REACTION_UPDATED,
      payload,
    );
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.TASK_TAG_ADDED)
  handleTaskTagAdded(payload: ProjectTaskTagWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_TASK_TAG_ADDED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.TASK_TAG_REMOVED)
  handleTaskTagRemoved(payload: ProjectTaskTagWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_TASK_TAG_REMOVED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.TASK_ATTACHMENT_ADDED)
  handleTaskAttachmentAdded(payload: ProjectTaskAttachmentWsPayload): void {
    this.emit(
      payload.projectId,
      WsEvents.PROJECT_TASK_ATTACHMENT_ADDED,
      payload,
    );
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.TASK_ATTACHMENT_REMOVED)
  handleTaskAttachmentRemoved(payload: ProjectTaskAttachmentWsPayload): void {
    this.emit(
      payload.projectId,
      WsEvents.PROJECT_TASK_ATTACHMENT_REMOVED,
      payload,
    );
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.STATUS_CREATED)
  handleStatusCreated(payload: ProjectStatusListWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_STATUS_CREATED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.STATUS_UPDATED)
  handleStatusUpdated(payload: ProjectStatusListWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_STATUS_UPDATED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.STATUS_DELETED)
  handleStatusDeleted(payload: ProjectStatusListWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_STATUS_DELETED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.MEMBER_INVITED)
  handleMemberInvited(payload: ProjectMemberInviteWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_MEMBER_INVITED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.MEMBER_JOINED)
  handleMemberJoined(payload: ProjectMemberWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_MEMBER_JOINED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.MEMBER_UPDATED)
  handleMemberUpdated(payload: ProjectMemberWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_MEMBER_UPDATED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.MEMBER_REMOVED)
  handleMemberRemoved(payload: ProjectMemberRemovedWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_MEMBER_REMOVED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.ROLE_CREATED)
  handleRoleCreated(payload: ProjectRoleWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_ROLE_CREATED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.ROLE_UPDATED)
  handleRoleUpdated(payload: ProjectRoleWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_ROLE_UPDATED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.ROLE_DELETED)
  handleRoleDeleted(payload: ProjectRoleDeletedWsPayload): void {
    this.emit(payload.projectId, WsEvents.PROJECT_ROLE_DELETED, payload);
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.ROLE_PERMISSIONS_UPDATED)
  handleRolePermissionsUpdated(payload: ProjectRoleWsPayload): void {
    this.emit(
      payload.projectId,
      WsEvents.PROJECT_ROLE_PERMISSIONS_UPDATED,
      payload,
    );
  }

  @OnEvent(PROJECT_REALTIME_EVENTS.ROLE_MEMBER_ASSIGNMENT_UPDATED)
  handleRoleMemberAssignmentUpdated(
    payload: ProjectRoleMemberAssignmentWsPayload,
  ): void {
    this.emit(
      payload.projectId,
      WsEvents.PROJECT_ROLE_MEMBER_ASSIGNMENT_UPDATED,
      payload,
    );
  }

  private emit<E extends WsEvent>(
    projectId: string,
    event: E,
    payload: WsEventPayloadMap[E],
  ): void {
    this.projectRealtimeSocketService.emitToProject(projectId, event, payload);
  }
}
