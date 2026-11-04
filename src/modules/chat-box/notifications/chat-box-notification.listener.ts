import {
  CHAT_BOX_EVENTS,
  ChatMessageDomainEvent,
  ChatMessagePinUpdatedDomainEvent,
  ChatMessageReactionUpdatedDomainEvent,
  ChatRoomInvitationsCreatedDomainEvent,
  ChatRoomMemberJoinedDomainEvent,
  ChatRoomMemberRemovedDomainEvent,
} from '@modules/chat-box/delegates/constants/chat-box-events.constant';
import {
  ChatMentionType,
  ChatMessageMention,
} from '@modules/chat-box/message-management/entities/message-mention.entity';
import {
  ChatMessage,
  ChatMessageType,
} from '@modules/chat-box/message-management/entities/message.entity';
import {
  ChatPresenceStatus,
  ChatUserPresence,
} from '@modules/chat-box/presence/entities/user-presence.entity';
import {
  ChatMemberRole,
  ChatNotifyLevel,
  ChatRoomMember,
} from '@modules/chat-box/room-management/entities/room-member.entity';
import {
  ChatRoom,
  ChatRoomType,
} from '@modules/chat-box/room-management/entities/room.entity';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { In, Repository } from 'typeorm';

type NotifyMemberRow = Pick<
  ChatRoomMember,
  'userId' | 'notifyLevel' | 'muteUntil' | 'isActive'
>;

@Injectable()
export class ChatBoxNotificationListener {
  private static readonly MESSAGE_BURST_WINDOW_MS = 30_000;
  private static readonly REACTION_BURST_WINDOW_MS = 8_000;
  private static readonly PIN_BURST_WINDOW_MS = 8_000;
  private static readonly PREVIEW_TEXT_MAX_LENGTH = 120;
  private static readonly FULL_MESSAGE_CONTENT_MAX_LENGTH = 2_000;
  private static readonly EMPTY_MESSAGE_FALLBACK =
    '[message has no text content]';
  private static readonly REDIS_RATE_LIMIT_PREFIX =
    'chat:notification:burst-limit:v1';
  private static readonly RATE_LIMIT_CLEANUP_WINDOW_MS = 10 * 60_000;
  private readonly localRateLimitFallbackMap = new Map<string, number>();
  private readonly logger = new Logger(ChatBoxNotificationListener.name);

  constructor(
    private readonly notificationService: NotificationCoreService,
    @InjectRepository(ChatRoom)
    private readonly roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatRoomMember)
    private readonly roomMemberRepo: Repository<ChatRoomMember>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatMessageMention)
    private readonly mentionRepo: Repository<ChatMessageMention>,
    @InjectRepository(ChatUserPresence)
    private readonly presenceRepo: Repository<ChatUserPresence>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepo: Repository<OrganizationMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_CREATED)
  async handleMessageCreated(event: ChatMessageDomainEvent): Promise<void> {
    const startedAt = Date.now();
    if (event.message.messageType === ChatMessageType.SYSTEM) {
      return;
    }

    const members = await this.roomMemberRepo.find({
      where: {
        organizationId: event.organizationId,
        roomId: event.roomId,
        isActive: true,
      },
      select: ['userId', 'notifyLevel', 'muteUntil', 'isActive'],
    });

    const recipients = members.filter(
      (member) => member.userId !== event.actorUserId,
    );
    if (recipients.length === 0) {
      return;
    }

    const activeOrgUserSet = await this.getActiveOrganizationUserSet(
      event.organizationId,
      recipients.map((member) => member.userId),
    );
    const scopedRecipients = recipients.filter((member) =>
      activeOrgUserSet.has(member.userId),
    );
    if (scopedRecipients.length === 0) {
      return;
    }

    const room = await this.roomRepo.findOne({
      where: { id: event.roomId, organizationId: event.organizationId },
      select: ['id', 'roomType', 'visibility', 'name', 'roomKey'],
    });
    if (!room) {
      return;
    }
    const roomLabel = this.resolveRoomLabel(room);

    const mentionPayloadMap = await this.getMentionPayloadMap({
      organizationId: event.organizationId,
      messageId: event.message.id,
    });
    const mentionSet = new Set(mentionPayloadMap.keys());

    const presenceStatusMap = await this.getPresenceStatusMap(
      event.organizationId,
      scopedRecipients.map((member) => member.userId),
    );
    const actor = await this.userRepo.findOne({
      where: { id: event.actorUserId },
      select: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
    });
    const actorName = this.resolveActorName(actor, event.actorUserId);
    const { previewText, fullMessageContent } =
      this.buildMessageContentPayload(event.message.content);
    const threadRootMessageId =
      event.message.threadRootMessageId || event.message.parentMessageId;
    const isThreadReplyMessage = Boolean(threadRootMessageId);

    let sentCount = 0;
    await Promise.all(
      scopedRecipients.map(async (member) => {
        const mentionPayload = mentionPayloadMap.get(member.userId);
        const isMention = mentionSet.has(member.userId);
        if (!this.shouldNotifyMember(member, isMention)) {
          return;
        }
        const presenceStatus = presenceStatusMap.get(member.userId);
        const realtimeDeliveryMeta =
          this.buildRealtimeDeliveryMeta(presenceStatus);

        const isThreadReply = isThreadReplyMessage && !isMention;
        const eventType = isMention
          ? 'chat.mention'
          : isThreadReply
            ? 'chat.thread.reply'
            : 'chat.message.new';
        const title = isMention
          ? `You were mentioned in ${roomLabel}`
          : isThreadReply
            ? `New thread reply in ${roomLabel}`
            : `New message in ${roomLabel}`;
        const message = isMention
          ? `${actorName} mentioned you: ${previewText}`
          : isThreadReply
            ? `${actorName} replied in a thread: ${previewText}`
            : `${actorName}: ${previewText}`;
        const dedupeKey = isMention
          ? `chat.mention:${event.message.id}:${member.userId}`
          : isThreadReply
            ? `chat.thread.reply:${event.message.id}:${member.userId}`
            : `chat.message.new:${event.message.id}:${member.userId}`;
        if (
          !isMention &&
          !isThreadReply &&
          room?.roomType === ChatRoomType.CHANNEL &&
          !(await this.allowByRateLimit(
            `chat.message.new:${event.organizationId}:${event.roomId}:${member.userId}`,
            ChatBoxNotificationListener.MESSAGE_BURST_WINDOW_MS,
          ))
        ) {
          return;
        }

        await this.notificationService.send({
          userId: member.userId,
          type: isMention ? 'warning' : 'info',
          title,
          message,
          dedupeKey,
          emitRealtime:
            isMention ||
            isThreadReply ||
            room?.roomType !== ChatRoomType.CHANNEL,
          data: {
            eventType,
            organizationId: event.organizationId,
            roomId: event.roomId,
            roomName: roomLabel,
            roomVisibility: room?.visibility,
            messageId: event.message.id,
            mentionId: mentionPayload?.id,
            mentionType: mentionPayload?.mentionType,
            specialMentionType: this.resolveSpecialMentionType(
              mentionPayload?.mentionType,
            ),
            parentMessageId: event.message.parentMessageId,
            threadRootMessageId,
            replySenderId: event.message.replyPreview?.senderId,
            actorUserId: event.actorUserId,
            actorName,
            actorAvatarUrl: actor?.avatarUrl,
            previewText,
            fullMessageContent,
            ...realtimeDeliveryMeta,
          },
        });
        sentCount += 1;
      }),
    );
    this.logFanOutSummary({
      eventType: 'chat.message.new',
      organizationId: event.organizationId,
      roomId: event.roomId,
      candidateCount: scopedRecipients.length,
      sentCount,
      startedAt,
    });
  }

  @OnEvent(CHAT_BOX_EVENTS.ROOM_INVITATIONS_CREATED)
  async handleInvitationsCreated(
    event: ChatRoomInvitationsCreatedDomainEvent,
  ): Promise<void> {
    const startedAt = Date.now();
    const invitationTargets = event.invitations.filter(
      (invitation) => invitation.invitedUserId !== event.inviterUserId,
    );
    if (invitationTargets.length === 0) {
      return;
    }

    const activeOrgUserSet = await this.getActiveOrganizationUserSet(
      event.organizationId,
      invitationTargets.map((invitation) => invitation.invitedUserId),
    );
    const scopedInvitationTargets = invitationTargets.filter((invitation) =>
      activeOrgUserSet.has(invitation.invitedUserId),
    );
    if (scopedInvitationTargets.length === 0) {
      return;
    }

    const room = await this.roomRepo.findOne({
      where: { id: event.roomId, organizationId: event.organizationId },
      select: ['id', 'roomType', 'visibility', 'name', 'roomKey'],
    });
    if (!room) {
      return;
    }
    const roomLabel = this.resolveRoomLabel(room);

    const presenceStatusMap = await this.getPresenceStatusMap(
      event.organizationId,
      scopedInvitationTargets.map((invitation) => invitation.invitedUserId),
    );
    const inviter = await this.userRepo.findOne({
      where: { id: event.inviterUserId },
      select: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
    });
    const inviterName = this.resolveActorName(inviter, event.inviterUserId);

    let sentCount = 0;
    await Promise.all(
      scopedInvitationTargets.map(async (invitation) => {
        const presenceStatus = presenceStatusMap.get(invitation.invitedUserId);
        const realtimeDeliveryMeta =
          this.buildRealtimeDeliveryMeta(presenceStatus);
        await this.notificationService.send({
          userId: invitation.invitedUserId,
          type: 'info',
          title: 'You have a room invitation',
          message: `${inviterName} invited you to ${roomLabel}`,
          dedupeKey: `chat.invitation:${invitation.id}`,
          emitRealtime: true,
          data: {
            eventType: 'chat.invitation',
            organizationId: event.organizationId,
            roomId: event.roomId,
            roomName: roomLabel,
            roomVisibility: room?.visibility,
            invitationId: invitation.id,
            invitationStatus: invitation.status,
            status: invitation.status,
            inviteStatus: invitation.status,
            acceptedAt: invitation.acceptedAt ?? null,
            memberRole: invitation.memberRole,
            invitedByUserId: event.inviterUserId,
            invitedByDisplayName: inviterName,
            actorUserId: event.inviterUserId,
            actorName: inviterName,
            actorAvatarUrl: inviter?.avatarUrl,
            inviteMessage: invitation.inviteMessage,
            ...realtimeDeliveryMeta,
          },
        });
        sentCount += 1;
      }),
    );
    this.logFanOutSummary({
      eventType: 'chat.invitation',
      organizationId: event.organizationId,
      roomId: event.roomId,
      candidateCount: scopedInvitationTargets.length,
      sentCount,
      startedAt,
    });
  }

  @OnEvent(CHAT_BOX_EVENTS.ROOM_MEMBER_JOINED)
  async handleMemberJoined(
    event: ChatRoomMemberJoinedDomainEvent,
  ): Promise<void> {
    const startedAt = Date.now();
    const room = await this.roomRepo.findOne({
      where: { id: event.roomId, organizationId: event.organizationId },
      select: ['id', 'roomType', 'visibility', 'name', 'roomKey'],
    });
    if (!room) {
      return;
    }
    const roomLabel = this.resolveRoomLabel(room);

    const managerMembers = await this.roomMemberRepo.find({
      where: {
        organizationId: event.organizationId,
        roomId: event.roomId,
        isActive: true,
        memberRole: In([ChatMemberRole.OWNER, ChatMemberRole.ADMIN]),
      },
      select: ['userId', 'notifyLevel', 'muteUntil', 'isActive'],
    });

    const recipients = managerMembers.filter(
      (member) => member.userId !== event.userId,
    );
    if (recipients.length === 0) {
      return;
    }

    const activeOrgUserSet = await this.getActiveOrganizationUserSet(
      event.organizationId,
      recipients.map((member) => member.userId),
    );
    const scopedRecipients = recipients.filter((member) =>
      activeOrgUserSet.has(member.userId),
    );
    if (scopedRecipients.length === 0) {
      return;
    }

    const joinedUser = await this.userRepo.findOne({
      where: { id: event.userId },
      select: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
    });
    const joinedUserName = this.resolveActorName(joinedUser, event.userId);
    const presenceStatusMap = await this.getPresenceStatusMap(
      event.organizationId,
      scopedRecipients.map((member) => member.userId),
    );

    let sentCount = 0;
    await Promise.all(
      scopedRecipients.map(async (member) => {
        if (!this.shouldNotifyMember(member, false)) {
          return;
        }
        const presenceStatus = presenceStatusMap.get(member.userId);
        const realtimeDeliveryMeta =
          this.buildRealtimeDeliveryMeta(presenceStatus);

        await this.notificationService.send({
          userId: member.userId,
          type: 'info',
          title: 'New member joined the room',
          message: `${joinedUserName} joined ${roomLabel}`,
          dedupeKey: `chat.member.joined:${event.roomId}:${event.userId}:${event.occurredAt}`,
          emitRealtime: true,
          data: {
            eventType: 'chat.member.joined',
            organizationId: event.organizationId,
            roomId: event.roomId,
            roomName: roomLabel,
            roomVisibility: room?.visibility,
            actorUserId: event.userId,
            actorName: joinedUserName,
            actorAvatarUrl: joinedUser?.avatarUrl,
            memberUserId: event.userId,
            joinSource: event.joinSource,
            ...realtimeDeliveryMeta,
          },
        });
        sentCount += 1;
      }),
    );
    this.logFanOutSummary({
      eventType: 'chat.member.joined',
      organizationId: event.organizationId,
      roomId: event.roomId,
      candidateCount: scopedRecipients.length,
      sentCount,
      startedAt,
    });
  }

  @OnEvent(CHAT_BOX_EVENTS.ROOM_MEMBER_REMOVED)
  async handleMemberRemoved(
    event: ChatRoomMemberRemovedDomainEvent,
  ): Promise<void> {
    const startedAt = Date.now();
    if (event.removedBySelf) {
      return;
    }
    if (event.memberUserId === event.actorUserId) {
      return;
    }
    if (
      !(await this.isActiveOrganizationMember(
        event.organizationId,
        event.memberUserId,
      ))
    ) {
      return;
    }

    const room = await this.roomRepo.findOne({
      where: { id: event.roomId, organizationId: event.organizationId },
      select: ['id', 'roomType', 'visibility', 'name', 'roomKey'],
    });
    if (!room) {
      return;
    }
    const roomLabel = this.resolveRoomLabel(room);

    const actor = await this.userRepo.findOne({
      where: { id: event.actorUserId },
      select: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
    });
    const actorName = this.resolveActorName(actor, event.actorUserId);
    const presenceStatus = await this.getPresenceStatus(
      event.organizationId,
      event.memberUserId,
    );
    const realtimeDeliveryMeta = this.buildRealtimeDeliveryMeta(presenceStatus);

    await this.notificationService.send({
      userId: event.memberUserId,
      type: 'warning',
      title: 'You were removed from the room',
      message: `${actorName} removed you from ${roomLabel}`,
      dedupeKey: `chat.member.removed:${event.roomId}:${event.memberUserId}:${event.actorUserId}:${event.occurredAt}`,
      emitRealtime: true,
      data: {
        eventType: 'chat.member.removed',
        organizationId: event.organizationId,
        roomId: event.roomId,
        roomName: roomLabel,
        roomVisibility: room?.visibility,
        actorUserId: event.actorUserId,
        actorName,
        actorAvatarUrl: actor?.avatarUrl,
        memberUserId: event.memberUserId,
        ...realtimeDeliveryMeta,
      },
    });
    this.logFanOutSummary({
      eventType: 'chat.member.removed',
      organizationId: event.organizationId,
      roomId: event.roomId,
      candidateCount: 1,
      sentCount: 1,
      startedAt,
    });
  }

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_REACTION_UPDATED)
  async handleReactionUpdated(
    event: ChatMessageReactionUpdatedDomainEvent,
  ): Promise<void> {
    const startedAt = Date.now();
    if (event.action !== 'added') {
      return;
    }

    const message = await this.messageRepo.findOne({
      where: {
        id: event.messageId,
        organizationId: event.organizationId,
        roomId: event.roomId,
        isDeleted: false,
      },
      select: ['id', 'senderId', 'content'],
    });
    if (!message?.senderId || message.senderId === event.actorUserId) {
      return;
    }

    const recipient = await this.roomMemberRepo.findOne({
      where: {
        organizationId: event.organizationId,
        roomId: event.roomId,
        userId: message.senderId,
        isActive: true,
      },
      select: ['userId', 'notifyLevel', 'muteUntil', 'isActive'],
    });
    if (!recipient || !this.shouldNotifyMember(recipient, false)) {
      return;
    }
    if (
      !(await this.isActiveOrganizationMember(
        event.organizationId,
        recipient.userId,
      ))
    ) {
      return;
    }

    const room = await this.roomRepo.findOne({
      where: { id: event.roomId, organizationId: event.organizationId },
      select: ['id', 'roomType', 'visibility', 'name', 'roomKey'],
    });
    if (!room) {
      return;
    }
    const roomLabel = this.resolveRoomLabel(room);

    const actor = await this.userRepo.findOne({
      where: { id: event.actorUserId },
      select: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
    });
    const actorName = this.resolveActorName(actor, event.actorUserId);
    const { previewText, fullMessageContent } =
      this.buildMessageContentPayload(message.content);
    const presenceStatus = await this.getPresenceStatus(
      event.organizationId,
      message.senderId,
    );
    const realtimeDeliveryMeta = this.buildRealtimeDeliveryMeta(presenceStatus);
    if (
      !(await this.allowByRateLimit(
        `chat.reaction:${event.organizationId}:${event.roomId}:${event.messageId}:${message.senderId}`,
        ChatBoxNotificationListener.REACTION_BURST_WINDOW_MS,
      ))
    ) {
      return;
    }

    await this.notificationService.send({
      userId: message.senderId,
      type: 'info',
      title: 'Your message has a new reaction',
      message: `${actorName} reacted ${event.emoji} to your message in ${roomLabel}`,
      dedupeKey: `chat.reaction:${event.messageId}:${event.actorUserId}:${event.emoji}`,
      emitRealtime: true,
      data: {
        eventType: 'chat.reaction',
        organizationId: event.organizationId,
        roomId: event.roomId,
        roomName: roomLabel,
        roomVisibility: room.visibility,
        messageId: event.messageId,
        actorUserId: event.actorUserId,
        actorName,
        actorAvatarUrl: actor?.avatarUrl,
        previewText,
        fullMessageContent,
        emoji: event.emoji,
        count: event.count,
        reactionEmoji: event.emoji,
        reactionCount: event.count,
        ...realtimeDeliveryMeta,
      },
    });
    this.logFanOutSummary({
      eventType: 'chat.reaction',
      organizationId: event.organizationId,
      roomId: event.roomId,
      candidateCount: 1,
      sentCount: 1,
      startedAt,
    });
  }

  @OnEvent(CHAT_BOX_EVENTS.MESSAGE_PIN_UPDATED)
  async handlePinUpdated(
    event: ChatMessagePinUpdatedDomainEvent,
  ): Promise<void> {
    const startedAt = Date.now();
    if (!event.isPinned) {
      return;
    }

    const message = await this.messageRepo.findOne({
      where: {
        id: event.messageId,
        organizationId: event.organizationId,
        roomId: event.roomId,
        isDeleted: false,
      },
      select: ['id', 'senderId', 'content'],
    });
    if (!message?.senderId || message.senderId === event.actorUserId) {
      return;
    }

    const recipient = await this.roomMemberRepo.findOne({
      where: {
        organizationId: event.organizationId,
        roomId: event.roomId,
        userId: message.senderId,
        isActive: true,
      },
      select: ['userId', 'notifyLevel', 'muteUntil', 'isActive'],
    });
    if (!recipient || !this.shouldNotifyMember(recipient, false)) {
      return;
    }
    if (
      !(await this.isActiveOrganizationMember(
        event.organizationId,
        recipient.userId,
      ))
    ) {
      return;
    }

    const room = await this.roomRepo.findOne({
      where: { id: event.roomId, organizationId: event.organizationId },
      select: ['id', 'roomType', 'visibility', 'name', 'roomKey'],
    });
    if (!room) {
      return;
    }
    const roomLabel = this.resolveRoomLabel(room);

    const actor = await this.userRepo.findOne({
      where: { id: event.actorUserId },
      select: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
    });
    const actorName = this.resolveActorName(actor, event.actorUserId);
    const { previewText, fullMessageContent } =
      this.buildMessageContentPayload(message.content);
    const presenceStatus = await this.getPresenceStatus(
      event.organizationId,
      message.senderId,
    );
    const realtimeDeliveryMeta = this.buildRealtimeDeliveryMeta(presenceStatus);
    if (
      !(await this.allowByRateLimit(
        `chat.pin:${event.organizationId}:${event.roomId}:${event.messageId}:${message.senderId}`,
        ChatBoxNotificationListener.PIN_BURST_WINDOW_MS,
      ))
    ) {
      return;
    }

    await this.notificationService.send({
      userId: message.senderId,
      type: 'info',
      title: 'Your message was pinned',
      message: `${actorName} pinned one of your messages in ${roomLabel}`,
      dedupeKey: `chat.pin:${event.messageId}:${event.actorUserId}:pinned`,
      emitRealtime: true,
      data: {
        eventType: 'chat.pin',
        organizationId: event.organizationId,
        roomId: event.roomId,
        roomName: roomLabel,
        roomVisibility: room.visibility,
        messageId: event.messageId,
        actorUserId: event.actorUserId,
        actorName,
        actorAvatarUrl: actor?.avatarUrl,
        previewText,
        fullMessageContent,
        ...realtimeDeliveryMeta,
      },
    });
    this.logFanOutSummary({
      eventType: 'chat.pin',
      organizationId: event.organizationId,
      roomId: event.roomId,
      candidateCount: 1,
      sentCount: 1,
      startedAt,
    });
  }

  private shouldNotifyMember(
    member: NotifyMemberRow,
    isMention: boolean,
  ): boolean {
    if (!member.isActive) {
      return false;
    }

    if (member.notifyLevel === ChatNotifyLevel.MUTE) {
      if (!member.muteUntil) {
        return false;
      }
      if (member.muteUntil.getTime() > Date.now()) {
        return false;
      }
    }

    if (member.notifyLevel === ChatNotifyLevel.MENTIONS && !isMention) {
      return false;
    }

    return true;
  }

  private async getMentionPayloadMap(params: {
    organizationId: string;
    messageId: string;
  }): Promise<Map<string, { id: string; mentionType: ChatMentionType }>> {
    const rows = await this.mentionRepo.find({
      where: {
        organizationId: params.organizationId,
        messageId: params.messageId,
      },
      select: ['id', 'mentionedUserId', 'mentionType'],
    });

    return new Map(
      rows.map((row) => [
        row.mentionedUserId,
        {
          id: row.id,
          mentionType: row.mentionType,
        },
      ]),
    );
  }

  private async getPresenceStatusMap(
    organizationId: string,
    userIds: string[],
  ): Promise<Map<string, ChatPresenceStatus>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const rows = await this.presenceRepo.find({
      where: {
        organizationId,
        userId: In(userIds),
      },
      select: ['userId', 'presenceStatus'],
    });

    return new Map(rows.map((row) => [row.userId, row.presenceStatus]));
  }

  private async getPresenceStatus(
    organizationId: string,
    userId: string,
  ): Promise<ChatPresenceStatus | null> {
    const presence = await this.presenceRepo.findOne({
      where: {
        organizationId,
        userId,
      },
      select: ['presenceStatus'],
    });
    return presence?.presenceStatus ?? null;
  }

  private async getActiveOrganizationUserSet(
    organizationId: string,
    userIds: string[],
  ): Promise<Set<string>> {
    if (userIds.length === 0) {
      return new Set();
    }

    const rows = await this.organizationMemberRepo.find({
      where: {
        organizationId,
        userId: In(userIds),
        isActive: true,
        isDeleted: false,
      },
      select: ['userId'],
    });

    const activeUserSet = await this.getActiveUserSet(
      rows.map((row) => row.userId),
    );
    return new Set(
      rows
        .map((row) => row.userId)
        .filter((userId) => activeUserSet.has(userId)),
    );
  }

  private async isActiveOrganizationMember(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await this.organizationMemberRepo.findOne({
      where: {
        organizationId,
        userId,
        isActive: true,
        isDeleted: false,
      },
      select: ['id'],
    });
    if (!membership) {
      return false;
    }

    const user = await this.userRepo.findOne({
      where: {
        id: userId,
        isActive: true,
      },
      select: ['id'],
    });

    return Boolean(user);
  }

  private async getActiveUserSet(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) {
      return new Set();
    }

    const rows = await this.userRepo.find({
      where: {
        id: In(userIds),
        isActive: true,
      },
      select: ['id'],
    });

    return new Set(rows.map((row) => row.id));
  }

  private buildRealtimeDeliveryMeta(
    presenceStatus?: ChatPresenceStatus | null,
  ): {
    realtimeDeliveryMode: 'normal' | 'silent';
    realtimeDeliveryReason?: 'recipient_dnd_or_offline';
  } {
    if (
      presenceStatus === ChatPresenceStatus.DND ||
      presenceStatus === ChatPresenceStatus.OFFLINE
    ) {
      return {
        realtimeDeliveryMode: 'silent',
        realtimeDeliveryReason: 'recipient_dnd_or_offline',
      };
    }

    return {
      realtimeDeliveryMode: 'normal',
    };
  }

  private resolveSpecialMentionType(
    mentionType?: ChatMentionType,
  ): 'channel' | 'everyone' | 'here' | undefined {
    if (mentionType === ChatMentionType.CHANNEL) {
      return 'channel';
    }
    if (mentionType === ChatMentionType.GROUP) {
      return 'everyone';
    }
    if (mentionType === ChatMentionType.HERE) {
      return 'here';
    }

    return undefined;
  }

  private resolveActorName(user: User | null, fallbackUserId: string): string {
    if (!user) {
      return fallbackUserId;
    }

    const fullName = [user.firstName, user.lastName]
      .filter((part) => Boolean(part))
      .join(' ')
      .trim();
    if (fullName) {
      return fullName;
    }

    return user.email || fallbackUserId;
  }

  private resolveRoomLabel(
    room: Pick<ChatRoom, 'roomType' | 'name' | 'roomKey'> | null,
  ): string {
    if (!room) {
      return 'chat room';
    }

    if (room.roomType === ChatRoomType.DM) {
      return 'direct chat';
    }
    if (room.roomType === ChatRoomType.GROUP_DM) {
      return room.name?.trim() || 'group chat';
    }

    return room.name?.trim() || room.roomKey?.trim() || 'channel';
  }

  private buildMessageContentPayload(content?: string): {
    previewText: string;
    fullMessageContent: string;
  } {
    const normalized = this.normalizeMessageContent(content);
    return {
      previewText: this.truncateText(
        normalized,
        ChatBoxNotificationListener.PREVIEW_TEXT_MAX_LENGTH,
      ),
      fullMessageContent: this.truncateText(
        normalized,
        ChatBoxNotificationListener.FULL_MESSAGE_CONTENT_MAX_LENGTH,
      ),
    };
  }

  private buildPreviewText(content?: string): string {
    return this.buildMessageContentPayload(content).previewText;
  }

  private normalizeMessageContent(content?: string): string {
    const normalized = content?.replace(/\r\n/g, '\n').trim();
    if (!normalized) {
      return ChatBoxNotificationListener.EMPTY_MESSAGE_FALLBACK;
    }

    return normalized;
  }

  private truncateText(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    if (maxLength > 3) {
      return `${content.slice(0, maxLength - 3)}...`;
    }

    return content.slice(0, maxLength);
  }

  private async allowByRateLimit(
    rateKey: string,
    windowMs: number,
  ): Promise<boolean> {
    const redisKey = `${ChatBoxNotificationListener.REDIS_RATE_LIMIT_PREFIX}:${rateKey}`;
    try {
      const result = await this.redis.set(redisKey, '1', 'PX', windowMs, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.warn(
        `Redis rate-limit check failed. Falling back to local map for key=${rateKey}: ${(error as Error).message}`,
      );
      return this.allowByLocalRateLimitFallback(rateKey, windowMs);
    }
  }

  private allowByLocalRateLimitFallback(
    rateKey: string,
    windowMs: number,
  ): boolean {
    const now = Date.now();
    const previous = this.localRateLimitFallbackMap.get(rateKey);
    if (previous && now - previous < windowMs) {
      return false;
    }

    this.localRateLimitFallbackMap.set(rateKey, now);
    if (this.localRateLimitFallbackMap.size > 5000) {
      this.cleanupLocalRateLimitFallback(now);
    }
    return true;
  }

  private cleanupLocalRateLimitFallback(now: number): void {
    const threshold =
      now - ChatBoxNotificationListener.RATE_LIMIT_CLEANUP_WINDOW_MS;
    for (const [
      rateKey,
      timestamp,
    ] of this.localRateLimitFallbackMap.entries()) {
      if (timestamp < threshold) {
        this.localRateLimitFallbackMap.delete(rateKey);
      }
    }
  }

  private logFanOutSummary(params: {
    eventType: string;
    organizationId: string;
    roomId?: string;
    candidateCount: number;
    sentCount: number;
    startedAt: number;
  }): void {
    const durationMs = Date.now() - params.startedAt;
    this.logger.debug(
      `[chat-notify-fanout] event=${params.eventType} org=${params.organizationId} room=${params.roomId ?? '-'} candidates=${params.candidateCount} sent=${params.sentCount} durationMs=${durationMs}`,
    );
  }
}
