import {
  CHAT_BOX_EVENTS,
  ChatMessageAttachmentAddedDomainEvent,
  ChatMessageAttachmentPreviewUpdatedDomainEvent,
  ChatMessageAttachmentRemovedDomainEvent,
  ChatMessageDomainEvent,
  ChatMessageLinkPreviewUpdatedDomainEvent,
  ChatMessagePinUpdatedDomainEvent,
  ChatMessageReactionUpdatedDomainEvent,
  ChatPersonalInboxRoomReadUpdatedDomainEvent,
  ChatPresenceUpdatedDomainEvent,
  ChatRoomInvitationsCreatedDomainEvent,
  ChatRoomMemberJoinedDomainEvent,
  ChatRoomMemberRemovedDomainEvent,
  ChatRoomReadStateUpdatedDomainEvent,
  ChatRoomMemberRoleUpdatedDomainEvent,
  ChatRoomUpdatedDomainEvent,
  ChatRoomVisibilityChangedDomainEvent,
} from '@modules/chat-box/delegates/constants/chat-box-events.constant';
import { ChatMessage } from '@modules/chat-box/message-management/entities/message.entity';
import { ChatReadState } from '@modules/chat-box/message-management/entities/read-state.entity';
import { ChatRoomMember } from '@modules/chat-box/room-management/entities/room-member.entity';
import { WsEvents, WsRooms } from '@modules/websocket/types';
import { WebsocketService } from '@modules/websocket/websocket.service';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ChatBoxWsListener {
  constructor(
    private readonly websocketService: WebsocketService,
    @InjectRepository(ChatRoomMember)
    private readonly roomMemberRepo: Repository<ChatRoomMember>,
  ) {}

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_CREATED)
  async handleMessageCreated(event: ChatMessageDomainEvent): Promise<void> {
    const members = await this.roomMemberRepo.find({
      where: {
        organizationId: event.organizationId,
        roomId: event.roomId,
        isActive: true,
      },
      select: ['userId'],
    });
    const memberUserIds = Array.from(
      new Set(members.map((member) => member.userId)),
    );

    for (const memberUserId of memberUserIds) {
      this.websocketService.emitToUser(
        memberUserId,
        WsEvents.CHAT_MESSAGE_CREATED,
        event,
        { namespace: 'chat' },
      );
    }

    const unreadRows = await this.roomMemberRepo.manager
      .createQueryBuilder(ChatRoomMember, 'rm')
      .leftJoin(
        ChatReadState,
        'rs',
        [
          'rs.organization_id = rm.organization_id',
          'rs.room_id = rm.room_id',
          'rs.user_id = rm.user_id',
        ].join(' AND '),
      )
      .leftJoin(
        ChatMessage,
        'm',
        [
          'm.organization_id = rm.organization_id',
          'm.room_id = rm.room_id',
          'm.is_deleted = false',
          '(m.sender_id IS NULL OR m.sender_id <> rm.user_id)',
          '(rs.last_read_at IS NULL OR m.sent_at > rs.last_read_at)',
        ].join(' AND '),
      )
      .where('rm.organization_id = :organizationId', {
        organizationId: event.organizationId,
      })
      .andWhere('rm.room_id = :roomId', { roomId: event.roomId })
      .andWhere('rm.is_active = true')
      .andWhere('rm.user_id <> :actorUserId', {
        actorUserId: event.actorUserId,
      })
      .select('rm.user_id', 'userId')
      .addSelect('rs.last_read_message_id', 'lastReadMessageId')
      .addSelect('rs.last_read_at', 'lastReadAt')
      .addSelect('rs.is_manual_unread_by_user', 'isManualUnreadByUser')
      .addSelect('rs.manual_unread_at', 'manualUnreadAt')
      .addSelect(
        'rs.manual_unread_from_message_id',
        'manualUnreadFromMessageId',
      )
      .addSelect('COUNT(m.id)', 'unreadCount')
      .groupBy('rm.user_id')
      .addGroupBy('rs.last_read_message_id')
      .addGroupBy('rs.last_read_at')
      .addGroupBy('rs.is_manual_unread_by_user')
      .addGroupBy('rs.manual_unread_at')
      .addGroupBy('rs.manual_unread_from_message_id')
      .getRawMany<{
        userId: string;
        lastReadMessageId?: string;
        lastReadAt?: Date;
        isManualUnreadByUser?: boolean;
        manualUnreadAt?: Date;
        manualUnreadFromMessageId?: string;
        unreadCount: string | number;
      }>();

    for (const row of unreadRows) {
      this.websocketService.emitToUser(
        row.userId,
        WsEvents.CHAT_ROOM_READ_STATE_UPDATED,
        {
          organizationId: event.organizationId,
          roomId: event.roomId,
          userId: row.userId,
          readStateMode: 'message_created',
          lastReadMessageId: row.lastReadMessageId || undefined,
          lastReadAt: row.lastReadAt || undefined,
          unreadCount: Number(row.unreadCount) || 0,
          isManualUnreadByUser: Boolean(row.isManualUnreadByUser),
          manualUnreadAt: row.manualUnreadAt || undefined,
          manualUnreadFromMessageId: row.manualUnreadFromMessageId || undefined,
          occurredAt: event.occurredAt,
        },
        { namespace: 'chat' },
      );
    }
  }

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_UPDATED)
  handleMessageUpdated(event: ChatMessageDomainEvent): void {
    this.websocketService.emitToRoom(
      WsRooms.chatRoom(event.roomId),
      WsEvents.CHAT_MESSAGE_UPDATED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_DELETED)
  handleMessageDeleted(event: ChatMessageDomainEvent): void {
    this.websocketService.emitToRoom(
      WsRooms.chatRoom(event.roomId),
      WsEvents.CHAT_MESSAGE_DELETED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_REACTION_UPDATED)
  handleMessageReactionUpdated(
    event: ChatMessageReactionUpdatedDomainEvent,
  ): void {
    this.websocketService.emitToRoom(
      WsRooms.chatRoom(event.roomId),
      WsEvents.CHAT_MESSAGE_REACTION_UPDATED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_PIN_UPDATED)
  handleMessagePinUpdated(event: ChatMessagePinUpdatedDomainEvent): void {
    this.websocketService.emitToRoom(
      WsRooms.chatRoom(event.roomId),
      WsEvents.CHAT_MESSAGE_PIN_UPDATED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_ATTACHMENT_ADDED)
  handleMessageAttachmentAdded(
    event: ChatMessageAttachmentAddedDomainEvent,
  ): void {
    this.websocketService.emitToRoom(
      WsRooms.chatRoom(event.roomId),
      WsEvents.CHAT_MESSAGE_ATTACHMENT_ADDED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_ATTACHMENT_REMOVED)
  handleMessageAttachmentRemoved(
    event: ChatMessageAttachmentRemovedDomainEvent,
  ): void {
    this.websocketService.emitToRoom(
      WsRooms.chatRoom(event.roomId),
      WsEvents.CHAT_MESSAGE_ATTACHMENT_REMOVED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_ATTACHMENT_PREVIEW_UPDATED)
  handleMessageAttachmentPreviewUpdated(
    event: ChatMessageAttachmentPreviewUpdatedDomainEvent,
  ): void {
    this.websocketService.emitToRoom(
      WsRooms.chatRoom(event.roomId),
      WsEvents.CHAT_MESSAGE_ATTACHMENT_PREVIEW_UPDATED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_LINK_PREVIEW_UPDATED)
  handleMessageLinkPreviewUpdated(
    event: ChatMessageLinkPreviewUpdatedDomainEvent,
  ): void {
    this.websocketService.emitToRoom(
      WsRooms.chatRoom(event.roomId),
      WsEvents.CHAT_MESSAGE_LINK_PREVIEW_UPDATED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.ROOM_INVITATIONS_CREATED)
  handleInvitationsCreated(event: ChatRoomInvitationsCreatedDomainEvent): void {
    for (const invitation of event.invitations) {
      this.websocketService.emitToUser(
        invitation.invitedUserId,
        WsEvents.CHAT_ROOM_INVITATION_CREATED,
        event,
        { namespace: 'chat' },
      );
    }
  }

  @OnEvent(CHAT_BOX_EVENTS.ROOM_MEMBER_JOINED)
  handleMemberJoined(event: ChatRoomMemberJoinedDomainEvent): void {
    this.websocketService.emitToRoom(
      WsRooms.chatRoom(event.roomId),
      WsEvents.CHAT_ROOM_MEMBER_JOINED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.ROOM_VISIBILITY_CHANGED)
  handleRoomVisibilityChanged(
    event: ChatRoomVisibilityChangedDomainEvent,
  ): void {
    this.websocketService.emitToOrg(
      event.organizationId,
      WsEvents.CHAT_ROOM_VISIBILITY_CHANGED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.ROOM_MEMBER_ROLE_UPDATED)
  handleMemberRoleUpdated(event: ChatRoomMemberRoleUpdatedDomainEvent): void {
    this.websocketService.emitToRoom(
      WsRooms.chatRoom(event.roomId),
      WsEvents.CHAT_ROOM_MEMBER_ROLE_UPDATED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.ROOM_MEMBER_REMOVED)
  handleMemberRemoved(event: ChatRoomMemberRemovedDomainEvent): void {
    this.websocketService.emitToRoom(
      WsRooms.chatRoom(event.roomId),
      WsEvents.CHAT_ROOM_MEMBER_REMOVED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.ROOM_READ_STATE_UPDATED)
  handleRoomReadStateUpdated(event: ChatRoomReadStateUpdatedDomainEvent): void {
    this.websocketService.emitToUser(
      event.userId,
      WsEvents.CHAT_ROOM_READ_STATE_UPDATED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.PERSONAL_INBOX_ROOM_READ_UPDATED)
  handlePersonalInboxRoomReadUpdated(
    event: ChatPersonalInboxRoomReadUpdatedDomainEvent,
  ): void {
    this.websocketService.emitToUser(
      event.userId,
      WsEvents.CHAT_PERSONAL_INBOX_ROOM_READ_UPDATED,
      event,
      { namespace: 'chat' },
    );
  }

  @OnEvent(CHAT_BOX_EVENTS.ROOM_UPDATED)
  async handleRoomUpdated(event: ChatRoomUpdatedDomainEvent): Promise<void> {
    const members = await this.roomMemberRepo.find({
      where: {
        organizationId: event.organizationId,
        roomId: event.roomId,
        isActive: true,
      },
      select: ['userId'],
    });
    const memberUserIds = Array.from(
      new Set(members.map((member) => member.userId)),
    );

    for (const memberUserId of memberUserIds) {
      this.websocketService.emitToUser(
        memberUserId,
        WsEvents.CHAT_ROOM_UPDATED,
        event,
        { namespace: 'chat' },
      );
    }
  }

  @OnEvent(CHAT_BOX_EVENTS.PRESENCE_UPDATED)
  handlePresenceUpdated(event: ChatPresenceUpdatedDomainEvent): void {
    this.websocketService.emitToOrg(
      event.organizationId,
      WsEvents.CHAT_PRESENCE_UPDATED,
      event,
      { namespace: 'chat' },
    );
  }
}
