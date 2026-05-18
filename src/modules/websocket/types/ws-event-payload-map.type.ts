import {
  ChatMessageAttachmentAddedWsPayload,
  ChatMessageAttachmentPreviewUpdatedWsPayload,
  ChatMessageAttachmentRemovedWsPayload,
  ChatMessageCreatedWsPayload,
  ChatMessageDeletedWsPayload,
  ChatMessageLinkPreviewUpdatedWsPayload,
  ChatPersonalInboxRoomReadUpdatedWsPayload,
  ChatMessagePinUpdatedWsPayload,
  ChatMessageReactionUpdatedWsPayload,
  ChatMessageUpdatedWsPayload,
  ChatPresenceUpdatedWsPayload,
  ChatRoomInvitationCreatedWsPayload,
  ChatRoomMemberJoinedWsPayload,
  ChatRoomMemberRemovedWsPayload,
  ChatRoomReadStateUpdatedWsPayload,
  ChatRoomMemberRoleUpdatedWsPayload,
  ChatRoomVisibilityChangedWsPayload,
  ChatTypingWsPayload,
} from './chat/chat.ws';
import { ChatRoomUpdatedDomainEvent } from '@modules/chat-box/delegates/constants/chat-box-events.constant';
import { NotificationWsPayload } from './notification/notification.ws';
import { CampaignProgressWsPayload } from './notification/campaign-progress.ws';
import { TicketRequestUpdatedWsPayload } from './ticket-request/ticket-request.ws';
import {
  BillingPaymentWsPayload,
  BillingRenewalReminderWsPayload,
  BillingSubscriptionExpiredWsPayload,
  BillingSubscriptionWsPayload,
} from './billing/billing.ws';
import { WsEvents } from './ws-events.constant';
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
} from './project/project.ws';

export interface WsEventPayloadMap {
  [WsEvents.NOTIFICATION_NEW]: NotificationWsPayload;
  [WsEvents.NOTIFICATION_UPDATED]: NotificationWsPayload;
  [WsEvents.CHAT_MESSAGE_CREATED]: ChatMessageCreatedWsPayload;
  [WsEvents.CHAT_MESSAGE_UPDATED]: ChatMessageUpdatedWsPayload;
  [WsEvents.CHAT_MESSAGE_DELETED]: ChatMessageDeletedWsPayload;
  [WsEvents.CHAT_MESSAGE_REACTION_UPDATED]: ChatMessageReactionUpdatedWsPayload;
  [WsEvents.CHAT_MESSAGE_PIN_UPDATED]: ChatMessagePinUpdatedWsPayload;
  [WsEvents.CHAT_MESSAGE_ATTACHMENT_ADDED]: ChatMessageAttachmentAddedWsPayload;
  [WsEvents.CHAT_MESSAGE_ATTACHMENT_REMOVED]: ChatMessageAttachmentRemovedWsPayload;
  [WsEvents.CHAT_MESSAGE_ATTACHMENT_PREVIEW_UPDATED]: ChatMessageAttachmentPreviewUpdatedWsPayload;
  [WsEvents.CHAT_MESSAGE_LINK_PREVIEW_UPDATED]: ChatMessageLinkPreviewUpdatedWsPayload;
  [WsEvents.CHAT_ROOM_INVITATION_CREATED]: ChatRoomInvitationCreatedWsPayload;
  [WsEvents.CHAT_ROOM_MEMBER_JOINED]: ChatRoomMemberJoinedWsPayload;
  [WsEvents.CHAT_ROOM_VISIBILITY_CHANGED]: ChatRoomVisibilityChangedWsPayload;
  [WsEvents.CHAT_ROOM_MEMBER_ROLE_UPDATED]: ChatRoomMemberRoleUpdatedWsPayload;
  [WsEvents.CHAT_ROOM_MEMBER_REMOVED]: ChatRoomMemberRemovedWsPayload;
  [WsEvents.CHAT_ROOM_READ_STATE_UPDATED]: ChatRoomReadStateUpdatedWsPayload;
  [WsEvents.CHAT_PERSONAL_INBOX_ROOM_READ_UPDATED]: ChatPersonalInboxRoomReadUpdatedWsPayload;
  [WsEvents.CHAT_ROOM_UPDATED]: ChatRoomUpdatedDomainEvent;
  [WsEvents.CHAT_PRESENCE_UPDATED]: ChatPresenceUpdatedWsPayload;
  [WsEvents.CHAT_TYPING_STARTED]: ChatTypingWsPayload;
  [WsEvents.CHAT_TYPING_STOPPED]: ChatTypingWsPayload;
  [WsEvents.CAMPAIGN_PROGRESS]: CampaignProgressWsPayload;
  [WsEvents.TICKET_REQUEST_UPDATED]: TicketRequestUpdatedWsPayload;
  [WsEvents.PROJECT_UPDATED]: ProjectUpdatedWsPayload;
  [WsEvents.PROJECT_TASK_CREATED]: ProjectTaskWsPayload;
  [WsEvents.PROJECT_TASK_UPDATED]: ProjectTaskWsPayload;
  [WsEvents.PROJECT_TASK_DELETED]: ProjectTaskDeletedWsPayload;
  [WsEvents.PROJECT_TASK_STATUS_CHANGED]: ProjectTaskWsPayload;
  [WsEvents.PROJECT_TASK_COMMENT_CREATED]: ProjectTaskCommentWsPayload;
  [WsEvents.PROJECT_TASK_COMMENT_REACTION_UPDATED]: ProjectTaskCommentWsPayload;
  [WsEvents.PROJECT_TASK_TAG_ADDED]: ProjectTaskTagWsPayload;
  [WsEvents.PROJECT_TASK_TAG_REMOVED]: ProjectTaskTagWsPayload;
  [WsEvents.PROJECT_TASK_ATTACHMENT_ADDED]: ProjectTaskAttachmentWsPayload;
  [WsEvents.PROJECT_TASK_ATTACHMENT_REMOVED]: ProjectTaskAttachmentWsPayload;
  [WsEvents.PROJECT_STATUS_CREATED]: ProjectStatusListWsPayload;
  [WsEvents.PROJECT_STATUS_UPDATED]: ProjectStatusListWsPayload;
  [WsEvents.PROJECT_STATUS_DELETED]: ProjectStatusListWsPayload;
  [WsEvents.PROJECT_MEMBER_INVITED]: ProjectMemberInviteWsPayload;
  [WsEvents.PROJECT_MEMBER_JOINED]: ProjectMemberWsPayload;
  [WsEvents.PROJECT_MEMBER_UPDATED]: ProjectMemberWsPayload;
  [WsEvents.PROJECT_MEMBER_REMOVED]: ProjectMemberRemovedWsPayload;
  [WsEvents.PROJECT_ROLE_CREATED]: ProjectRoleWsPayload;
  [WsEvents.PROJECT_ROLE_UPDATED]: ProjectRoleWsPayload;
  [WsEvents.PROJECT_ROLE_DELETED]: ProjectRoleDeletedWsPayload;
  [WsEvents.PROJECT_ROLE_PERMISSIONS_UPDATED]: ProjectRoleWsPayload;
  [WsEvents.PROJECT_ROLE_MEMBER_ASSIGNMENT_UPDATED]: ProjectRoleMemberAssignmentWsPayload;
  [WsEvents.BILLING_PAYMENT_SUCCESS]: BillingPaymentWsPayload;
  [WsEvents.BILLING_PAYMENT_FAILED]: BillingPaymentWsPayload;
  [WsEvents.BILLING_SUBSCRIPTION_UPDATED]: BillingSubscriptionWsPayload;
  [WsEvents.BILLING_SUBSCRIPTION_RENEWAL_REMINDER]: BillingRenewalReminderWsPayload;
  [WsEvents.BILLING_SUBSCRIPTION_EXPIRED]: BillingSubscriptionExpiredWsPayload;
}
