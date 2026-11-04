import {
  ChatLinkPreviewStatus,
  LinkPreviewResponse,
} from '@modules/chat-box/message-management/dto/response/link-preview.response';
import { MessageAttachmentResponse } from '@modules/chat-box/message-management/dto/response/message-attachment.response';
import { MessagePinStateResponse } from '@modules/chat-box/message-management/dto/response/message-pin-state.response';
import { RoomMessageResponse } from '@modules/chat-box/message-management/dto/response/room-message.response';
import { PresenceResponse } from '@modules/chat-box/presence/dto/response/presence.response';
import { RoomInvitationResponse } from '@modules/chat-box/room-management/dto/response/room-invitation.response';
import { ChatMemberRole } from '@modules/chat-box/room-management/entities/room-member.entity';

export const CHAT_BOX_EVENTS = {
  MESSAGE_CREATED: 'chat.message.created',
  MESSAGE_UPDATED: 'chat.message.updated',
  MESSAGE_DELETED: 'chat.message.deleted',
  MESSAGE_REACTION_UPDATED: 'chat.message.reaction.updated',
  MESSAGE_PIN_UPDATED: 'chat.message.pin.updated',
  MESSAGE_ATTACHMENT_ADDED: 'chat.message.attachment.added',
  MESSAGE_ATTACHMENT_REMOVED: 'chat.message.attachment.removed',
  MESSAGE_ATTACHMENT_PREVIEW_UPDATED: 'chat.message.attachment-preview.updated',
  MESSAGE_LINK_PREVIEW_UPDATED: 'chat.message.link-preview.updated',
  ROOM_INVITATIONS_CREATED: 'chat.room.invitations.created',
  ROOM_MEMBER_JOINED: 'chat.room.member.joined',
  ROOM_VISIBILITY_CHANGED: 'chat.room.visibility.changed',
  ROOM_MEMBER_ROLE_UPDATED: 'chat.room.member.role.updated',
  ROOM_MEMBER_REMOVED: 'chat.room.member.removed',
  ROOM_READ_STATE_UPDATED: 'chat.room.read-state.updated',
  PERSONAL_INBOX_ROOM_READ_UPDATED: 'chat.personal-inbox.room-read.updated',
  ROOM_UPDATED: 'chat.room.updated',
  PRESENCE_UPDATED: 'chat.presence.updated',
} as const;

export type ChatRoomRealtimeSnapshot = {
  id: string;
  roomType: 'channel' | 'dm' | 'group_dm';
  visibility: 'public' | 'private';
  name?: string;
  roomKey?: string;
  topic?: string;
  description?: string;
  memberCount: number;
  isArchived: boolean;
  allowMemberPinMessages: boolean;
  allowGuestPinMessages: boolean;
  ownerId?: string;
  updatedAt: string;
};

export interface ChatRoomSidebarDelta {
  roomId: string;
  reason:
    | 'message_created'
    | 'message_updated'
    | 'message_deleted'
    | 'reaction_updated';
  messageId?: string;
  lastMessageId?: string;
  lastMessageAt?: Date;
  lastMessageSnippet?: string;
  shouldRefreshRoomSummary?: boolean;
}

export interface ChatMessageDomainEvent {
  organizationId: string;
  roomId: string;
  actorUserId: string;
  message: RoomMessageResponse;
  roomDelta?: ChatRoomSidebarDelta;
  occurredAt: string;
}

export interface ChatMessageReactionUpdatedDomainEvent {
  organizationId: string;
  roomId: string;
  messageId: string;
  actorUserId: string;
  emoji: string;
  count: number;
  reactedByMe: boolean;
  reactorUserIds?: string[];
  reactors: {
    userId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName: string;
    avatarUrl?: string;
    reactedAt: Date;
  }[];
  roomDelta?: ChatRoomSidebarDelta;
  action: 'added' | 'removed';
  occurredAt: string;
}

export interface ChatMessagePinUpdatedDomainEvent {
  eventId: string;
  organizationId: string;
  roomId: string;
  messageId: string;
  actorUserId: string;
  action: 'pinned' | 'unpinned';
  isPinned: boolean;
  roomPinVersion: number;
  pinnedCount: number;
  pin: MessagePinStateResponse | null;
  occurredAt: string;
}

export interface ChatMessageAttachmentAddedDomainEvent {
  organizationId: string;
  roomId: string;
  messageId: string;
  actorUserId: string;
  attachment: MessageAttachmentResponse;
  occurredAt: string;
}

export interface ChatMessageAttachmentRemovedDomainEvent {
  organizationId: string;
  roomId: string;
  messageId: string;
  actorUserId: string;
  attachmentId: string;
  occurredAt: string;
}

export interface ChatMessageAttachmentPreviewUpdatedDomainEvent {
  organizationId: string;
  roomId: string;
  messageId: string;
  attachmentId: string;
  actorUserId: string;
  attachment: MessageAttachmentResponse;
  occurredAt: string;
}

export interface ChatMessageLinkPreviewUpdatedDomainEvent {
  organizationId: string;
  roomId: string;
  messageId: string;
  actorUserId: string;
  linkPreviews: LinkPreviewResponse[];
  metadata: {
    linkPreviewStatus: ChatLinkPreviewStatus;
    linkPreviewPendingUrls: string[];
    linkPreviewFailedUrls: string[];
    linkPreviewVersion?: string;
  };
  occurredAt: string;
}

export interface ChatRoomInvitationsCreatedDomainEvent {
  organizationId: string;
  roomId: string;
  inviterUserId: string;
  invitations: RoomInvitationResponse[];
  occurredAt: string;
}

export interface ChatRoomMemberJoinedDomainEvent {
  organizationId: string;
  roomId: string;
  userId: string;
  joinSource: string;
  occurredAt: string;
}

export interface ChatRoomVisibilityChangedDomainEvent {
  organizationId: string;
  roomId: string;
  visibility: 'public' | 'private';
  changedByUserId: string;
  changedByDisplayName: string;
  changedAt: string;
}

export interface ChatRoomMemberRoleUpdatedDomainEvent {
  organizationId: string;
  roomId: string;
  actorUserId: string;
  memberUserId: string;
  previousRole: ChatMemberRole;
  currentRole: ChatMemberRole;
  occurredAt: string;
}

export interface ChatRoomMemberRemovedDomainEvent {
  organizationId: string;
  roomId: string;
  actorUserId: string;
  memberUserId: string;
  removedBySelf: boolean;
  previousOwnerUserId?: string;
  currentOwnerUserId?: string;
  occurredAt: string;
}

export interface ChatRoomReadStateUpdatedDomainEvent {
  organizationId: string;
  roomId: string;
  userId: string;
  readStateMode?: 'mark_read' | 'mark_unread' | 'message_created';
  lastReadMessageId?: string;
  lastReadAt?: Date;
  unreadCount: number;
  isManualUnreadByUser?: boolean;
  manualUnreadAt?: Date;
  manualUnreadFromMessageId?: string;
  occurredAt: string;
}

export interface ChatPersonalInboxRoomReadUpdatedDomainEvent {
  organizationId: string;
  roomId: string;
  userId: string;
  updatedCounts: {
    mentions: number;
    notifications: number;
    total: number;
  };
  lastReadAt: Date;
  occurredAt: string;
}

export interface ChatRoomUpdatedDomainEvent {
  organizationId: string;
  roomId: string;
  roomType: 'channel' | 'dm' | 'group_dm';
  updatedByUserId: string;
  updatedAt: string;
  changeType:
    | 'room_info'
    | 'room_policies'
    | 'room_visibility'
    | 'room_archived'
    | 'room_unarchived'
    | 'member_role'
    | 'member_removed'
    | 'ownership_transferred';
  room: ChatRoomRealtimeSnapshot;
  previousOwnerUserId?: string;
  currentOwnerUserId?: string;
}

export interface ChatPresenceUpdatedDomainEvent {
  organizationId: string;
  actorUserId: string;
  presence: PresenceResponse;
  occurredAt: string;
}
