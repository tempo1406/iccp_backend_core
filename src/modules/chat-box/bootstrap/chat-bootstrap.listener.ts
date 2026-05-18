import { ChatBootstrapRoomService } from '@modules/chat-box/bootstrap/chat-bootstrap-room.service';
import {
  OrganizationCreatedDomainEvent,
  OrganizationMemberJoinedDomainEvent,
  ORGANIZATION_DOMAIN_EVENTS,
} from '@modules/organization/core/constants/organization-domain-events.constant';
import {
  ProjectCreatedDomainEvent,
  ProjectMemberJoinedDomainEvent,
  PROJECT_DOMAIN_EVENTS,
} from '@modules/project/core/constants/project-domain-events.constant';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class ChatBootstrapListener {
  private readonly logger = new Logger(ChatBootstrapListener.name);

  constructor(
    private readonly chatBootstrapRoomService: ChatBootstrapRoomService,
  ) {}

  @OnEvent(ORGANIZATION_DOMAIN_EVENTS.ORGANIZATION_CREATED, { async: true })
  async handleOrganizationCreated(
    event: OrganizationCreatedDomainEvent,
  ): Promise<void> {
    try {
      await this.chatBootstrapRoomService.ensureOrganizationDefaultRooms(
        event.organizationId,
        event.ownerUserId,
      );
    } catch (error) {
      this.logger.warn(
        `Organization bootstrap failed. organizationId=${event.organizationId}, ownerUserId=${event.ownerUserId}, error=${(error as Error).message}`,
      );
    }
  }

  @OnEvent(ORGANIZATION_DOMAIN_EVENTS.MEMBER_JOINED, { async: true })
  async handleOrganizationMemberJoined(
    event: OrganizationMemberJoinedDomainEvent,
  ): Promise<void> {
    try {
      await this.chatBootstrapRoomService.syncOrganizationDefaultRoomsForMember(
        event.organizationId,
        event.userId,
      );
    } catch (error) {
      this.logger.warn(
        `Organization member sync failed. organizationId=${event.organizationId}, userId=${event.userId}, error=${(error as Error).message}`,
      );
    }
  }

  @OnEvent(PROJECT_DOMAIN_EVENTS.PROJECT_CREATED, { async: true })
  async handleProjectCreated(event: ProjectCreatedDomainEvent): Promise<void> {
    try {
      await this.chatBootstrapRoomService.ensureProjectDefaultRoom(
        event.organizationId,
        event.projectId,
        event.actorUserId,
      );
    } catch (error) {
      this.logger.warn(
        `Project bootstrap failed. organizationId=${event.organizationId}, projectId=${event.projectId}, error=${(error as Error).message}`,
      );
    }
  }

  @OnEvent(PROJECT_DOMAIN_EVENTS.MEMBER_JOINED, { async: true })
  async handleProjectMemberJoined(
    event: ProjectMemberJoinedDomainEvent,
  ): Promise<void> {
    try {
      await this.chatBootstrapRoomService.syncProjectDefaultRoomForMember(
        event.organizationId,
        event.projectId,
        event.userId,
      );
    } catch (error) {
      this.logger.warn(
        `Project member sync failed. organizationId=${event.organizationId}, projectId=${event.projectId}, userId=${event.userId}, error=${(error as Error).message}`,
      );
    }
  }
}
