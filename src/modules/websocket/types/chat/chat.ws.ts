import {
  ChatMessageAttachmentAddedDomainEvent,
  ChatMessageAttachmentPreviewUpdatedDomainEvent,
  ChatMessageAttachmentRemovedDomainEvent,
  ChatMessageDomainEvent,
  ChatMessageLinkPreviewUpdatedDomainEvent,
  ChatPersonalInboxRoomReadUpdatedDomainEvent,
  ChatMessagePinUpdatedDomainEvent,
  ChatMessageReactionUpdatedDomainEvent,
  ChatPresenceUpdatedDomainEvent,
  ChatRoomReadStateUpdatedDomainEvent,
  ChatRoomInvitationsCreatedDomainEvent,
  ChatRoomMemberJoinedDomainEvent,
  ChatRoomMemberRemovedDomainEvent,
  ChatRoomMemberRoleUpdatedDomainEvent,
  ChatRoomVisibilityChangedDomainEvent,
} from '@modules/chat-box/delegates/constants/chat-box-events.constant';

export type ChatMessageCreatedWsPayload = ChatMessageDomainEvent;
export type ChatMessageUpdatedWsPayload = ChatMessageDomainEvent;
export type ChatMessageDeletedWsPayload = ChatMessageDomainEvent;

export type ChatMessageReactionUpdatedWsPayload =
  ChatMessageReactionUpdatedDomainEvent;

export type ChatMessagePinUpdatedWsPayload = ChatMessagePinUpdatedDomainEvent;

export type ChatMessageAttachmentAddedWsPayload =
  ChatMessageAttachmentAddedDomainEvent;

export type ChatMessageAttachmentRemovedWsPayload =
  ChatMessageAttachmentRemovedDomainEvent;

export type ChatMessageAttachmentPreviewUpdatedWsPayload =
  ChatMessageAttachmentPreviewUpdatedDomainEvent;

export type ChatMessageLinkPreviewUpdatedWsPayload =
  ChatMessageLinkPreviewUpdatedDomainEvent;

export type ChatRoomInvitationCreatedWsPayload =
  ChatRoomInvitationsCreatedDomainEvent;

export type ChatRoomMemberJoinedWsPayload = ChatRoomMemberJoinedDomainEvent;

export type ChatRoomVisibilityChangedWsPayload =
  ChatRoomVisibilityChangedDomainEvent;

export type ChatRoomMemberRoleUpdatedWsPayload =
  ChatRoomMemberRoleUpdatedDomainEvent;

export type ChatRoomMemberRemovedWsPayload = ChatRoomMemberRemovedDomainEvent;

export type ChatPresenceUpdatedWsPayload = ChatPresenceUpdatedDomainEvent;
export type ChatRoomReadStateUpdatedWsPayload =
  ChatRoomReadStateUpdatedDomainEvent;
export type ChatPersonalInboxRoomReadUpdatedWsPayload =
  ChatPersonalInboxRoomReadUpdatedDomainEvent;

export type ChatTypingWsPayload = {
  organizationId: string;
  roomId: string;
  userId: string;
  occurredAt: string;
  expiresAt?: string;
};
