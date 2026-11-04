/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-template-expressions */
import {
  CHAT_BOX_EVENTS,
  ChatMessagePinUpdatedDomainEvent,
  ChatPersonalInboxRoomReadUpdatedDomainEvent,
  ChatMessageReactionUpdatedDomainEvent,
  ChatRoomReadStateUpdatedDomainEvent,
} from '@modules/chat-box/delegates/constants/chat-box-events.constant';
import { AddMessageReactionRequest } from '@modules/chat-box/message-management/dto/request/add-message-reaction.request';
import { ListMyMentionsQueryRequest } from '@modules/chat-box/message-management/dto/request/list-my-mentions-query.request';
import { MarkMyMentionsReadRequest } from '@modules/chat-box/message-management/dto/request/mark-my-mentions-read.request';
import {
  MarkPersonalInboxRoomReadRequest,
  PersonalInboxReadKind,
} from '@modules/chat-box/message-management/dto/request/mark-personal-inbox-room-read.request';
import { RemoveMessageReactionQueryRequest } from '@modules/chat-box/message-management/dto/request/remove-message-reaction-query.request';
import {
  ChatReadStateMode,
  UpdateReadStateRequest,
} from '@modules/chat-box/message-management/dto/request/update-read-state.request';
import { MentionResponse } from '@modules/chat-box/message-management/dto/response/mention.response';
import {
  PersonalInboxRoomReadResponse,
} from '@modules/chat-box/message-management/dto/response/personal-inbox-room-read.response';
import { PinnedMessageResponse } from '@modules/chat-box/message-management/dto/response/pinned-message.response';
import { MessagePinStateResponse } from '@modules/chat-box/message-management/dto/response/message-pin-state.response';
import { ReadStateResponse } from '@modules/chat-box/message-management/dto/response/read-state.response';
import { UnreadCountResponse } from '@modules/chat-box/message-management/dto/response/unread-count.response';
import { UnreadAggregatesResponse } from '@modules/chat-box/message-management/dto/response/unread-aggregates.response';
import { UnreadSummaryResponse } from '@modules/chat-box/message-management/dto/response/unread-summary.response';
import { UpdateMentionReadResponse } from '@modules/chat-box/message-management/dto/response/update-mention-read.response';
import { UpdateMessagePinResponse } from '@modules/chat-box/message-management/dto/response/update-message-pin.response';
import { UpdateMessageReactionResponse } from '@modules/chat-box/message-management/dto/response/update-message-reaction.response';
import { MessageReactionsByMessageResponse } from '@modules/chat-box/message-management/dto/response/message-reactions-by-message.response';
import { ChatMessageMention } from '@modules/chat-box/message-management/entities/message-mention.entity';
import { ChatMessagePin } from '@modules/chat-box/message-management/entities/message-pin.entity';
import { ChatMessageReaction } from '@modules/chat-box/message-management/entities/message-reaction.entity';
import { ChatMessage } from '@modules/chat-box/message-management/entities/message.entity';
import { ChatReadState } from '@modules/chat-box/message-management/entities/read-state.entity';
import { UpdateMyRoomNotifySettingsRequest } from '@modules/chat-box/room-management/dto/request/update-my-room-notify-settings.request';
import { UpdateMyRoomVisibilityRequest } from '@modules/chat-box/room-management/dto/request/update-my-room-visibility.request';
import { UpdateMyRoomNotifySettingsResponse } from '@modules/chat-box/room-management/dto/response/update-my-room-notify-settings.response';
import { UpdateMyRoomVisibilityResponse } from '@modules/chat-box/room-management/dto/response/update-my-room-visibility.response';
import {
  ChatHiddenReason,
  ChatMemberRole,
  ChatNotifyLevel,
  ChatRoomMember,
} from '@modules/chat-box/room-management/entities/room-member.entity';
import {
  ChatRoom,
  ChatRoomType,
} from '@modules/chat-box/room-management/entities/room.entity';
import { Notification } from '@modules/notification/core/entities/notification.entity';
import { User } from '@modules/users/entities/user.entity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { In } from 'typeorm';
import { RoomMessageResponse } from '@modules/chat-box/message-management/dto/response/room-message.response';
import { MarkMyMentionsReadResponse } from '@modules/chat-box/message-management/dto/response/mark-my-mentions-read.response';
import { MessageReactionSummaryResponse } from '@modules/chat-box/message-management/dto/response/message-reaction-summary.response';
import { ChatBoxServiceDelegateContext } from './message-delegate.types';
import {
  buildUserRoomsStateCacheVersionKey,
  buildUserRoomStateCacheVersionKey,
} from '../chat-box-room.delegate';

const ROOM_PIN_VERSION_KEY_PREFIX = 'chat:room-pin-version:v1';
const ROOM_PIN_VERSION_KEY_TTL_SECONDS = 60 * 60 * 24 * 30;
const localRoomPinVersionFallbackMap = new Map<string, number>();
const DEFAULT_PERSONAL_INBOX_READ_KINDS = [
  PersonalInboxReadKind.MENTIONS,
  PersonalInboxReadKind.NOTIFICATIONS,
] as const;

function toUnreadAggregatesFromUnreadSummary(params: {
  unreadSummary: Pick<UnreadSummaryResponse, 'totalUnread' | 'rooms'>;
  notificationUnreadCount: number;
}): UnreadAggregatesResponse {
  const roomUnreadMessageCount = params.unreadSummary.totalUnread;
  const myInboxUnreadItemCount = params.unreadSummary.rooms.filter(
    (room) => room.unreadCount > 0,
  ).length;

  return {
    roomUnreadMessageCount,
    myInboxUnreadItemCount,
    myInboxUnreadMessageCount: roomUnreadMessageCount,
    notificationUnreadCount: params.notificationUnreadCount,
  };
}

export async function updateMyReadState(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  dto: UpdateReadStateRequest,
): Promise<ReadStateResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const mode = dto.mode ?? ChatReadStateMode.MARK_READ;
  let targetMessageId: string | undefined;
  let targetReadAt: Date | undefined;
  let manualUnreadAt: Date | undefined;
  let manualUnreadFromMessageId: string | undefined;

  if (mode === ChatReadStateMode.MARK_READ) {
    if (dto.fromMessageId) {
      throw new BadRequestException(
        'fromMessageId is only supported when mode=mark_unread',
      );
    }

    if (dto.lastReadMessageId) {
      const targetMessage = await this.messageRepo.findOne({
        where: {
          id: dto.lastReadMessageId,
          organizationId,
          roomId,
          isDeleted: false,
        },
        select: ['id', 'sentAt'],
      });
      if (!targetMessage) {
        throw new NotFoundException('Read-state target message not found');
      }
      targetMessageId = targetMessage.id;
      targetReadAt = targetMessage.sentAt;
    } else {
      targetReadAt = new Date();
      const latestMessage = await this.messageRepo.findOne({
        where: {
          organizationId,
          roomId,
          isDeleted: false,
        },
        order: { sentAt: 'DESC' },
        select: ['id', 'sentAt'],
      });
      if (latestMessage && latestMessage.sentAt <= targetReadAt) {
        targetMessageId = latestMessage.id;
      }
    }
  } else {
    if (dto.lastReadMessageId) {
      throw new BadRequestException(
        'lastReadMessageId is not allowed when mode=mark_unread',
      );
    }
    if (!dto.fromMessageId) {
      throw new BadRequestException(
        'fromMessageId is required when mode=mark_unread',
      );
    }

    const fromMessage = await this.messageRepo.findOne({
      where: {
        id: dto.fromMessageId,
        organizationId,
        roomId,
        isDeleted: false,
      },
      select: ['id', 'sentAt'],
    });
    if (!fromMessage) {
      throw new NotFoundException('Mark-unread target message not found');
    }
    manualUnreadAt = new Date();
    manualUnreadFromMessageId = fromMessage.id;
  }

  if (
    mode !== ChatReadStateMode.MARK_READ &&
    mode !== ChatReadStateMode.MARK_UNREAD
  ) {
    throw new BadRequestException(`Unsupported read-state mode: ${mode}`);
  }

  if (targetReadAt && Number.isNaN(targetReadAt.getTime())) {
    throw new BadRequestException('Invalid read-state timestamp');
  }

  let readState = await this.readStateRepo.findOne({
    where: { organizationId, roomId, userId },
  });

  if (!readState) {
    readState = this.readStateRepo.create({
      organizationId,
      roomId,
      userId,
    });
  }

  if (mode === ChatReadStateMode.MARK_READ) {
    readState.lastReadMessageId = targetMessageId;
    readState.lastReadAt = targetReadAt;
    readState.isManualUnreadByUser = false;
    readState.manualUnreadAt = undefined;
    readState.manualUnreadFromMessageId = undefined;
  } else {
    readState.isManualUnreadByUser = true;
    readState.manualUnreadAt = manualUnreadAt;
    readState.manualUnreadFromMessageId = manualUnreadFromMessageId;
  }
  readState.unreadCountCache = await this.getUnreadCountForRoom({
    organizationId,
    roomId,
    userId,
    lastReadAt: readState.lastReadAt,
  });

  const saved = await this.readStateRepo.save(readState);
  await Promise.all([
    this.bumpCacheVersionNumber(
      buildUserRoomsStateCacheVersionKey({
        organizationId,
        userId,
      }),
    ),
    this.bumpCacheVersionNumber(
      buildUserRoomStateCacheVersionKey({
        organizationId,
        roomId,
        userId,
      }),
    ),
  ]);
  if (saved.lastReadAt && mode === ChatReadStateMode.MARK_READ) {
    await this.markMentionsAsReadByReadState({
      organizationId,
      roomId,
      userId,
      lastReadAt: saved.lastReadAt,
    });
  }

  const readStateEvent: ChatRoomReadStateUpdatedDomainEvent = {
    organizationId,
    roomId: saved.roomId,
    userId: saved.userId,
    readStateMode: mode,
    lastReadMessageId: saved.lastReadMessageId,
    lastReadAt: saved.lastReadAt,
    unreadCount: saved.unreadCountCache,
    isManualUnreadByUser: saved.isManualUnreadByUser,
    manualUnreadAt: saved.manualUnreadAt,
    manualUnreadFromMessageId: saved.manualUnreadFromMessageId,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.ROOM_READ_STATE_UPDATED, readStateEvent);

  const unreadSummarySnapshot =
    typeof this.listMyUnreadCounts === 'function'
      ? await this.listMyUnreadCounts(organizationId, userId)
      : await listMyUnreadCounts.call(this, organizationId, userId);
  const afterAggregates =
    unreadSummarySnapshot.aggregates ??
    toUnreadAggregatesFromUnreadSummary({
      unreadSummary: unreadSummarySnapshot,
      notificationUnreadCount:
        await this.notificationService.countUnreadByUser(
          userId,
          organizationId,
        ),
    });

  return {
    roomId: saved.roomId,
    userId: saved.userId,
    lastReadMessageId: saved.lastReadMessageId,
    lastReadAt: saved.lastReadAt,
    unreadCount: saved.unreadCountCache,
    isManualUnreadByUser: saved.isManualUnreadByUser,
    manualUnreadAt: saved.manualUnreadAt,
    manualUnreadFromMessageId: saved.manualUnreadFromMessageId,
    afterAggregates,
  };
}
export async function listMyUnreadCounts(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
): Promise<UnreadSummaryResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const joinedRooms = (await this.roomRepo
    .createQueryBuilder('r')
    .innerJoin(
      ChatRoomMember,
      'rm',
      'rm.room_id = r.id AND rm.organization_id = :organizationId AND rm.user_id = :userId AND rm.is_active = true',
      { organizationId, userId },
    )
    .where('r.organization_id = :organizationId', { organizationId })
    .select([
      'r.id AS "roomId"',
      'r.name AS "roomName"',
      'r.room_type AS "roomType"',
      'r.last_message_at AS "lastMessageAt"',
    ])
    .getRawMany()) as Array<{
    roomId: string;
    roomName?: string;
    roomType: ChatRoomType;
    lastMessageAt?: Date;
  }>;

  if (joinedRooms.length === 0) {
    const notificationUnreadCount =
      await this.notificationService.countUnreadByUser(userId, organizationId);
    const emptySummary: UnreadSummaryResponse = {
      totalUnread: 0,
      rooms: [],
      aggregates: {
        roomUnreadMessageCount: 0,
        myInboxUnreadItemCount: 0,
        myInboxUnreadMessageCount: 0,
        notificationUnreadCount,
      },
    };
    return {
      ...emptySummary,
    };
  }

  const readStates = (await this.readStateRepo.find({
    where: {
      organizationId,
      userId,
      roomId: In(joinedRooms.map((room) => room.roomId)),
    },
    select: ['roomId', 'lastReadAt', 'lastReadMessageId'],
  })) as Array<{
    roomId: string;
    lastReadAt?: Date;
    lastReadMessageId?: string;
  }>;
  const readStateMap = new Map(
    readStates.map((state) => [state.roomId, state]),
  );
  const candidateRoomIds = joinedRooms
    .filter((room) => {
      const lastMessageAt = room.lastMessageAt;
      if (!lastMessageAt) {
        return false;
      }

      const readState = readStateMap.get(room.roomId);
      if (!readState?.lastReadAt) {
        return true;
      }

      return lastMessageAt > readState.lastReadAt;
    })
    .map((room) => room.roomId);

  const unreadCountRows: Array<{ roomId: string; unreadCount: string }> =
    candidateRoomIds.length > 0
      ? await this.messageRepo
          .createQueryBuilder('m')
          .leftJoin(
            ChatReadState,
            'rs',
            [
              'rs.organization_id = m.organization_id',
              'rs.room_id = m.room_id',
              'rs.user_id = :userId',
            ].join(' AND '),
            { userId },
          )
          .where('m.organization_id = :organizationId', { organizationId })
          .andWhere('m.room_id IN (:...candidateRoomIds)', {
            candidateRoomIds,
          })
          .andWhere('m.is_deleted = false')
          .andWhere('(m.sender_id IS NULL OR m.sender_id <> :userId)', {
            userId,
          })
          .andWhere('(rs.last_read_at IS NULL OR m.sent_at > rs.last_read_at)')
          .select('m.room_id', 'roomId')
          .addSelect('COUNT(*)', 'unreadCount')
          .groupBy('m.room_id')
          .getRawMany()
      : [];
  const unreadCountMap = new Map(
    unreadCountRows.map((row) => [row.roomId, Number(row.unreadCount)]),
  );

  const rooms = joinedRooms.map((room) => {
    const readState = readStateMap.get(room.roomId);
    const item: UnreadCountResponse = {
      roomId: room.roomId,
      roomName: room.roomName,
      roomType: room.roomType,
      unreadCount: unreadCountMap.get(room.roomId) ?? 0,
      lastReadMessageId: readState?.lastReadMessageId,
      lastReadAt: readState?.lastReadAt,
      lastMessageAt: room.lastMessageAt,
    };

    return item;
  });

  const summary: UnreadSummaryResponse = {
    totalUnread: rooms.reduce((sum, room) => sum + room.unreadCount, 0),
    rooms,
    aggregates: {
      roomUnreadMessageCount: 0,
      myInboxUnreadItemCount: 0,
      myInboxUnreadMessageCount: 0,
      notificationUnreadCount: 0,
    },
  };
  const notificationUnreadCount = await this.notificationService.countUnreadByUser(
    userId,
    organizationId,
  );
  summary.aggregates = toUnreadAggregatesFromUnreadSummary({
    unreadSummary: summary,
    notificationUnreadCount,
  });

  return summary;
}
export async function addMessageReaction(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
  dto: AddMessageReactionRequest,
): Promise<UpdateMessageReactionResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const message = await this.messageRepo.findOne({
    where: { id: messageId, organizationId, roomId, isDeleted: false },
    select: ['id'],
  });
  if (!message) {
    throw new NotFoundException('Message not found');
  }

  const emoji = dto.emoji?.trim();
  if (!emoji) {
    throw new BadRequestException('emoji is required');
  }

  const existing = await this.reactionRepo.findOne({
    where: {
      organizationId,
      messageId,
      userId,
      emoji,
    },
  });

  let updated = false;
  if (!existing) {
    updated = true;
    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        manager.create(ChatMessageReaction, {
          organizationId,
          messageId,
          userId,
          emoji,
        }),
      );

      await manager
        .createQueryBuilder()
        .update(ChatMessage)
        .set({ reactionCount: () => '"reaction_count" + 1' })
        .where('id = :id', { id: messageId })
        .execute();
    });
  }

  const reactionSummaries = await this.buildMessageReactionSummaries({
    organizationId,
    messageId,
    viewerUserId: userId,
  });
  const targetSummary = this.pickReactionSummary({
    reactionSummaries,
    emoji,
  });

  if (updated) {
    const event: ChatMessageReactionUpdatedDomainEvent = {
      organizationId,
      roomId,
      messageId,
      actorUserId: userId,
      emoji,
      count: targetSummary.count,
      reactedByMe: targetSummary.reactedByMe,
      reactorUserIds: targetSummary.reactors.map((item) => item.userId),
      reactors: targetSummary.reactors,
      roomDelta: {
        roomId,
        reason: 'reaction_updated',
        messageId,
        shouldRefreshRoomSummary: false,
      },
      action: 'added',
      occurredAt: new Date().toISOString(),
    };
    this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_REACTION_UPDATED, event);
  }

  return {
    ...targetSummary,
    updated,
  };
}
export async function updateMyRoomNotifySettings(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  dto: UpdateMyRoomNotifySettingsRequest,
): Promise<UpdateMyRoomNotifySettingsResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  const previousNotifyLevel = access.member.notifyLevel;
  const previousMuteUntil = access.member.muteUntil;

  const nextNotifyLevel = dto.notifyLevel ?? previousNotifyLevel;
  const nextMuteUntil =
    nextNotifyLevel === ChatNotifyLevel.MUTE && dto.muteUntil
      ? new Date(dto.muteUntil)
      : undefined;

  if (nextMuteUntil && Number.isNaN(nextMuteUntil.getTime())) {
    throw new BadRequestException('muteUntil must be a valid ISO datetime');
  }

  const updated =
    previousNotifyLevel !== nextNotifyLevel ||
    (previousMuteUntil?.toISOString() ?? undefined) !==
      (nextMuteUntil?.toISOString() ?? undefined);

  if (updated) {
    access.member.notifyLevel = nextNotifyLevel;
    access.member.muteUntil = nextMuteUntil;
    await this.roomMemberRepo.save(access.member);
  }

  return {
    roomId: access.room.id,
    userId: access.member.userId,
    previousNotifyLevel,
    currentNotifyLevel: nextNotifyLevel,
    previousMuteUntil,
    currentMuteUntil: nextMuteUntil,
    updated,
  };
}
export async function updateMyRoomVisibility(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  dto: UpdateMyRoomVisibilityRequest,
): Promise<UpdateMyRoomVisibilityResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  const previousIsHidden = access.member.isHidden;
  const previousHiddenReason = access.member.hiddenReason;
  const previousHiddenAt = access.member.hiddenAt;

  const nextIsHidden = dto.isHidden;
  const nextHiddenReason = nextIsHidden
    ? (dto.hiddenReason ?? ChatHiddenReason.MANUAL_HIDE)
    : undefined;
  const nextHiddenAt = nextIsHidden
    ? previousIsHidden
      ? (previousHiddenAt ?? new Date())
      : new Date()
    : undefined;

  const updated =
    previousIsHidden !== nextIsHidden ||
    previousHiddenReason !== nextHiddenReason ||
    (previousHiddenAt?.toISOString() ?? undefined) !==
      (nextHiddenAt?.toISOString() ?? undefined);

  if (updated) {
    access.member.isHidden = nextIsHidden;
    access.member.hiddenReason = nextHiddenReason;
    access.member.hiddenAt = nextHiddenAt;
    await this.roomMemberRepo.save(access.member);
  }

  return {
    roomId: access.room.id,
    userId: access.member.userId,
    previousIsHidden,
    currentIsHidden: nextIsHidden,
    previousHiddenReason,
    currentHiddenReason: nextHiddenReason,
    previousHiddenAt,
    currentHiddenAt: nextHiddenAt,
    updated,
  };
}
export async function removeMessageReaction(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
  query: RemoveMessageReactionQueryRequest,
): Promise<UpdateMessageReactionResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const message = await this.messageRepo.findOne({
    where: { id: messageId, organizationId, roomId, isDeleted: false },
    select: ['id'],
  });
  if (!message) {
    throw new NotFoundException('Message not found');
  }

  const emoji = query.emoji?.trim();
  if (!emoji) {
    throw new BadRequestException('emoji is required');
  }

  const existing = await this.reactionRepo.findOne({
    where: {
      organizationId,
      messageId,
      userId,
      emoji,
    },
  });

  let updated = false;
  if (existing) {
    updated = true;
    await this.dataSource.transaction(async (manager) => {
      await manager.remove(existing);
      await manager
        .createQueryBuilder()
        .update(ChatMessage)
        .set({ reactionCount: () => 'GREATEST("reaction_count" - 1, 0)' })
        .where('id = :id', { id: messageId })
        .execute();
    });
  }

  const reactionSummaries = await this.buildMessageReactionSummaries({
    organizationId,
    messageId,
    viewerUserId: userId,
  });
  const targetSummary = this.pickReactionSummary({
    reactionSummaries,
    emoji,
  });

  if (updated) {
    const event: ChatMessageReactionUpdatedDomainEvent = {
      organizationId,
      roomId,
      messageId,
      actorUserId: userId,
      emoji,
      count: targetSummary.count,
      reactedByMe: targetSummary.reactedByMe,
      reactorUserIds: targetSummary.reactors.map((item) => item.userId),
      reactors: targetSummary.reactors,
      roomDelta: {
        roomId,
        reason: 'reaction_updated',
        messageId,
        shouldRefreshRoomSummary: false,
      },
      action: 'removed',
      occurredAt: new Date().toISOString(),
    };
    this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_REACTION_UPDATED, event);
  }

  return {
    ...targetSummary,
    updated,
  };
}
export async function listMessageReactions(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
): Promise<MessageReactionSummaryResponse[]> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const message = await this.messageRepo.findOne({
    where: { id: messageId, organizationId, roomId, isDeleted: false },
    select: ['id'],
  });
  if (!message) {
    throw new NotFoundException('Message not found');
  }

  return this.buildMessageReactionSummaries({
    organizationId,
    messageId,
    viewerUserId: userId,
  });
}
export async function listMessageReactionsByMessageIds(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  messageIds: string[],
): Promise<MessageReactionsByMessageResponse[]> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const normalizedMessageIds = Array.from(
    new Set((messageIds || []).map((item) => item.trim()).filter(Boolean)),
  );
  if (normalizedMessageIds.length === 0) {
    return [];
  }
  if (normalizedMessageIds.length > 100) {
    throw new BadRequestException(
      'messageIds supports up to 100 message ids per request',
    );
  }

  const existingMessages = await this.messageRepo.find({
    where: {
      organizationId,
      roomId,
      id: In(normalizedMessageIds),
      isDeleted: false,
    },
    select: ['id'],
  });
  if (existingMessages.length !== normalizedMessageIds.length) {
    throw new NotFoundException('One or more messages not found');
  }

  const reactionSummariesByMessage =
    await this.buildMessageReactionSummariesByMessageIds({
      organizationId,
      messageIds: normalizedMessageIds,
      viewerUserId: userId,
    });

  return normalizedMessageIds.map((messageId) => ({
    messageId,
    reactionSummaries: reactionSummariesByMessage.get(messageId) || [],
  }));
}
export async function listMyMentions(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  query: ListMyMentionsQueryRequest,
): Promise<MentionResponse[]> {
  await this.assertActiveOrgMember(organizationId, userId);

  const qb = this.mentionRepo
    .createQueryBuilder('mn')
    .innerJoin(
      ChatMessage,
      'm',
      'm.id = mn.message_id AND m.is_deleted = false',
    )
    .leftJoin(ChatRoom, 'r', 'r.id = m.room_id')
    .leftJoin(User, 'u', 'u.id = m.sender_id')
    .where('mn.organization_id = :organizationId', { organizationId })
    .andWhere('mn.mentioned_user_id = :userId', { userId });

  if (query.isRead !== undefined) {
    qb.andWhere('mn.is_read = :isRead', { isRead: query.isRead });
  }

  const rows = (await qb
    .select([
      'mn.id AS "mentionId"',
      'mn.mention_type AS "mentionType"',
      'mn.is_read AS "isRead"',
      'mn.read_at AS "readAt"',
      'm.id AS "messageId"',
      'm.room_id AS "roomId"',
      'm.content AS "messageContent"',
      'm.sent_at AS "messageSentAt"',
      'r.name AS "roomName"',
      'r.visibility AS "roomVisibility"',
      'u.email AS "senderEmail"',
      'u.first_name AS "senderFirstName"',
      'u.last_name AS "senderLastName"',
      'u.avatar_url AS "senderAvatarUrl"',
    ])
    .orderBy('mn.created_at', 'DESC')
    .limit(query.limit || 30)
    .getRawMany()) as MentionResponse[];

  return rows;
}
export async function markMentionAsRead(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  mentionId: string,
  userId: string,
): Promise<UpdateMentionReadResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const mention = await this.mentionRepo.findOne({
    where: {
      id: mentionId,
      organizationId,
      mentionedUserId: userId,
    },
  });
  if (!mention) {
    throw new NotFoundException('Mention not found');
  }

  let updated = false;
  if (!mention.isRead) {
    updated = true;
    mention.isRead = true;
    mention.readAt = new Date();
    await this.mentionRepo.save(mention);
  }

  const mentionRows = (await this.mentionRepo
    .createQueryBuilder('mn')
    .innerJoin(ChatMessage, 'm', 'm.id = mn.message_id')
    .leftJoin(ChatRoom, 'r', 'r.id = m.room_id')
    .leftJoin(User, 'u', 'u.id = m.sender_id')
    .where('mn.id = :mentionId', { mentionId })
    .andWhere('mn.organization_id = :organizationId', { organizationId })
    .andWhere('mn.mentioned_user_id = :userId', { userId })
    .select([
      'mn.id AS "mentionId"',
      'mn.mention_type AS "mentionType"',
      'mn.is_read AS "isRead"',
      'mn.read_at AS "readAt"',
      'm.id AS "messageId"',
      'm.room_id AS "roomId"',
      'm.content AS "messageContent"',
      'm.sent_at AS "messageSentAt"',
      'r.name AS "roomName"',
      'r.visibility AS "roomVisibility"',
      'u.email AS "senderEmail"',
      'u.first_name AS "senderFirstName"',
      'u.last_name AS "senderLastName"',
      'u.avatar_url AS "senderAvatarUrl"',
    ])
    .getRawMany()) as MentionResponse[];

  if (mentionRows.length === 0) {
    throw new NotFoundException('Mention not found');
  }

  return {
    updated,
    mention: mentionRows[0],
  };
}
export async function markMyMentionsAsRead(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  query: MarkMyMentionsReadRequest,
): Promise<MarkMyMentionsReadResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  if (query.roomId) {
    await this.getRoomAccessForCaller(organizationId, query.roomId, userId);
  }

  const mentionIds = (await this.mentionRepo
    .createQueryBuilder('mn')
    .innerJoin(
      ChatMessage,
      'm',
      'm.id = mn.message_id AND m.is_deleted = false',
    )
    .where('mn.organization_id = :organizationId', { organizationId })
    .andWhere('mn.mentioned_user_id = :userId', { userId })
    .andWhere('mn.is_read = false')
    .andWhere(query.roomId ? 'm.room_id = :roomId' : '1=1', {
      roomId: query.roomId,
    })
    .select('mn.id', 'id')
    .getRawMany()) as Array<{ id: string }>;

  if (mentionIds.length === 0) {
    return {
      updatedCount: 0,
      roomId: query.roomId,
    };
  }

  const now = new Date();
  await this.mentionRepo.update(
    { id: In(mentionIds.map((item) => item.id)) },
    { isRead: true, readAt: now },
  );

  return {
    updatedCount: mentionIds.length,
    roomId: query.roomId,
  };
}

export async function markPersonalInboxRoomAsRead(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  dto: MarkPersonalInboxRoomReadRequest = {},
): Promise<PersonalInboxRoomReadResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  if (dto.includeKinds && dto.includeKinds.length === 0) {
    throw new BadRequestException(
      'includeKinds must contain at least one supported kind',
    );
  }

  const includeKinds = dto.includeKinds
    ? Array.from(new Set(dto.includeKinds))
    : [...DEFAULT_PERSONAL_INBOX_READ_KINDS];

  const now = new Date();
  const updatedNotificationIds: string[] = [];
  const counts = await this.dataSource.transaction(async (manager) => {
    let mentionUpdatedCount = 0;
    let notificationUpdatedCount = 0;

    if (includeKinds.includes(PersonalInboxReadKind.MENTIONS)) {
      const mentionIds = (await manager
        .createQueryBuilder(ChatMessageMention, 'mn')
        .innerJoin(
          ChatMessage,
          'm',
          'm.id = mn.message_id AND m.is_deleted = false',
        )
        .where('mn.organization_id = :organizationId', { organizationId })
        .andWhere('mn.mentioned_user_id = :userId', { userId })
        .andWhere('mn.is_read = false')
        .andWhere('m.room_id = :roomId', { roomId })
        .select('mn.id', 'id')
        .getRawMany()) as Array<{ id: string }>;

      if (mentionIds.length > 0) {
        await manager.update(
          ChatMessageMention,
          { id: In(mentionIds.map((item) => item.id)) },
          { isRead: true, readAt: now },
        );
        mentionUpdatedCount = mentionIds.length;
      }
    }

    if (includeKinds.includes(PersonalInboxReadKind.NOTIFICATIONS)) {
      const notificationRows = (await manager
        .createQueryBuilder(Notification, 'n')
        .where('user_id = :userId', { userId })
        .andWhere('is_read = false')
        .andWhere('deleted_at IS NULL')
        .andWhere(
          "COALESCE(data ->> 'organizationId', data ->> 'orgId') = :organizationId",
          { organizationId },
        )
        .andWhere("data ->> 'roomId' = :roomId", { roomId })
        .select('n.id', 'id')
        .getRawMany()) as Array<{ id: string }>;

      if (notificationRows.length > 0) {
        const notificationIds = notificationRows.map((item) => item.id);
        await manager
          .createQueryBuilder()
          .update(Notification)
          .set({ isRead: true })
          .where('user_id = :userId', { userId })
          .andWhere('is_read = false')
          .andWhere('deleted_at IS NULL')
          .andWhere('id IN (:...notificationIds)', {
            notificationIds,
          })
          .execute();

        notificationUpdatedCount = notificationRows.length;
        updatedNotificationIds.push(...notificationIds);
      }
    }

    return {
      mentions: mentionUpdatedCount,
      notifications: notificationUpdatedCount,
      total: mentionUpdatedCount + notificationUpdatedCount,
    };
  });

  if (updatedNotificationIds.length > 0) {
    await this.notificationService.emitUpdatedByIds(
      userId,
      updatedNotificationIds,
    );
  }

  const event: ChatPersonalInboxRoomReadUpdatedDomainEvent = {
    organizationId,
    roomId,
    userId,
    updatedCounts: counts,
    lastReadAt: now,
    occurredAt: now.toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.PERSONAL_INBOX_ROOM_READ_UPDATED, event);

  const unreadSummarySnapshot =
    typeof this.listMyUnreadCounts === 'function'
      ? await this.listMyUnreadCounts(organizationId, userId)
      : await listMyUnreadCounts.call(this, organizationId, userId);
  const afterAggregates =
    unreadSummarySnapshot.aggregates ??
    toUnreadAggregatesFromUnreadSummary({
      unreadSummary: unreadSummarySnapshot,
      notificationUnreadCount:
        await this.notificationService.countUnreadByUser(
          userId,
          organizationId,
        ),
    });

  return {
    roomId,
    organizationId,
    updated: counts.total > 0,
    updatedCounts: counts,
    lastReadAt: now,
    afterAggregates,
  };
}

export async function pinMessage(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
): Promise<UpdateMessagePinResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  if (!access.permissions.canPinMessages) {
    throw new ForbiddenException('You do not have permission to pin messages');
  }

  const message = await this.messageRepo.findOne({
    where: { id: messageId, roomId, organizationId, isDeleted: false },
  });
  if (!message) {
    throw new NotFoundException('Message not found');
  }

  let pin = await this.pinRepo.findOne({
    where: { organizationId, roomId, messageId },
  });

  const activePinsCount = await countActivePinsInRoom.call(
    this,
    organizationId,
    roomId,
  );

  if (pin?.isActive) {
    const roomPinVersion = await getCurrentRoomPinVersion.call(
      this,
      organizationId,
      roomId,
    );
    return {
      action: 'pinned',
      roomId,
      messageId,
      updated: false,
      isPinned: true,
      roomPinVersion,
      pinnedCount: activePinsCount,
      pin: toMessagePinStateResponse(pin),
    };
  }

  if (activePinsCount >= this.constructor.MAX_ACTIVE_PINS_PER_ROOM) {
    throw new ConflictException(
      `Pinned message limit reached: maximum ${this.constructor.MAX_ACTIVE_PINS_PER_ROOM} active pins per room`,
    );
  }

  if (!pin) {
    pin = this.pinRepo.create({
      organizationId,
      roomId,
      messageId,
      pinnedBy: userId,
      isActive: true,
    });
  } else {
    pin.isActive = true;
    pin.pinnedBy = userId;
    pin.pinnedAt = new Date();
    pin.unpinnedAt = undefined;
  }

  const savedPin = await this.pinRepo.save(pin);
  const pinnedCount = await countActivePinsInRoom.call(this, organizationId, roomId);
  const roomPinVersion = await nextRoomPinVersion.call(this, organizationId, roomId);
  const pinState = toMessagePinStateResponse(savedPin);

  const event: ChatMessagePinUpdatedDomainEvent = {
    eventId: randomUUID(),
    organizationId,
    roomId,
    messageId,
    actorUserId: userId,
    action: 'pinned',
    isPinned: true,
    roomPinVersion,
    pinnedCount,
    pin: pinState,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_PIN_UPDATED, event);

  return {
    action: 'pinned',
    roomId,
    messageId,
    updated: true,
    isPinned: true,
    roomPinVersion,
    pinnedCount,
    pin: pinState,
  };
}
export async function unpinMessage(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
): Promise<UpdateMessagePinResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  if (!access.permissions.canPinMessages) {
    throw new ForbiddenException(
      'You do not have permission to unpin messages',
    );
  }

  const pin = await this.pinRepo.findOne({
    where: {
      organizationId,
      roomId,
      messageId,
      isActive: true,
    },
  });
  if (!pin) {
    const [roomPinVersion, pinnedCount] = await Promise.all([
      getCurrentRoomPinVersion.call(this, organizationId, roomId),
      countActivePinsInRoom.call(this, organizationId, roomId),
    ]);
    return {
      action: 'unpinned',
      roomId,
      messageId,
      updated: false,
      isPinned: false,
      roomPinVersion,
      pinnedCount,
      pin: null,
    };
  }

  pin.isActive = false;
  pin.unpinnedAt = new Date();
  await this.pinRepo.save(pin);
  const pinnedCount = await countActivePinsInRoom.call(this, organizationId, roomId);
  const roomPinVersion = await nextRoomPinVersion.call(this, organizationId, roomId);

  const event: ChatMessagePinUpdatedDomainEvent = {
    eventId: randomUUID(),
    organizationId,
    roomId,
    messageId,
    actorUserId: userId,
    action: 'unpinned',
    isPinned: false,
    roomPinVersion,
    pinnedCount,
    pin: null,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_PIN_UPDATED, event);
  return {
    action: 'unpinned',
    roomId,
    messageId,
    updated: true,
    isPinned: false,
    roomPinVersion,
    pinnedCount,
    pin: null,
  };
}
export async function listPinnedMessages(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  options?: {
    limit?: number;
  },
): Promise<PinnedMessageResponse[]> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const pins = await this.pinRepo.find({
    where: {
      organizationId,
      roomId,
      isActive: true,
    },
    order: {
      pinnedAt: 'DESC',
    },
    take:
      options?.limit && options.limit > 0
        ? Math.min(options.limit, this.constructor.MAX_ACTIVE_PINS_PER_ROOM)
        : undefined,
  });
  if (pins.length === 0) {
    return [];
  }

  const messageIds = pins.map((pin) => pin.messageId);
  const messageRows = await this.buildRoomMessageQuery({
    organizationId,
    roomId,
    includeDeleted: false,
  })
    .andWhere('m.id IN (:...messageIds)', { messageIds })
    .getRawMany();

  if (messageRows.length === 0) {
    return [];
  }

  const enrichedMessages = await this.enrichRoomMessages({
    organizationId,
    userId,
    messages: messageRows.map((row) => this.toRoomMessageResponseFromRawRow(row)),
    resolveInternalLinkPreviews: false,
  });
  const messageMap = new Map(enrichedMessages.map((message) => [message.id, message]));

  return pins.flatMap((pin) => {
    const message = messageMap.get(pin.messageId);
    if (!message) {
      return [];
    }
    return [this.toPinnedMessageResponse(pin, message)];
  });
}

export function toPinnedMessageResponse(
  pin: ChatMessagePin,
  message: RoomMessageResponse,
): PinnedMessageResponse {
  return {
    id: pin.id,
    roomId: pin.roomId,
    messageId: pin.messageId,
    pinnedBy: pin.pinnedBy,
    pinnedAt: pin.pinnedAt,
    message,
  };
}

export function toMessagePinStateResponse(
  pin: ChatMessagePin,
): MessagePinStateResponse {
  return {
    id: pin.id,
    roomId: pin.roomId,
    messageId: pin.messageId,
    pinnedBy: pin.pinnedBy,
    pinnedAt: pin.pinnedAt,
  };
}

function toRoomPinVersionNumber(value: unknown): number {
  const next =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  if (!Number.isFinite(next) || next < 0) {
    return 0;
  }
  return Math.floor(next);
}

function buildRoomPinVersionKey(organizationId: string, roomId: string): string {
  return `${ROOM_PIN_VERSION_KEY_PREFIX}:${organizationId}:${roomId}`;
}

function nextLocalRoomPinVersion(versionKey: string): number {
  const previous = localRoomPinVersionFallbackMap.get(versionKey) || 0;
  const next = previous + 1;
  localRoomPinVersionFallbackMap.set(versionKey, next);
  return next;
}

function syncLocalRoomPinVersion(versionKey: string, candidate: number): void {
  const previous = localRoomPinVersionFallbackMap.get(versionKey) || 0;
  if (candidate > previous) {
    localRoomPinVersionFallbackMap.set(versionKey, candidate);
  }
}

async function countActivePinsInRoom(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
): Promise<number> {
  return this.pinRepo.count({
    where: {
      organizationId,
      roomId,
      isActive: true,
    },
  });
}

async function getCurrentRoomPinVersion(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
): Promise<number> {
  const versionKey = buildRoomPinVersionKey(organizationId, roomId);
  const localCurrent = localRoomPinVersionFallbackMap.get(versionKey) || 0;

  try {
    const redisVersion = await this.redis.get(versionKey);
    const parsed = toRoomPinVersionNumber(redisVersion);
    const current = Math.max(parsed, localCurrent);
    if (current > 0) {
      syncLocalRoomPinVersion(versionKey, current);
      return current;
    }
  } catch {
    // ignore redis failures and fallback to local monotonic state
  }

  return localCurrent;
}

async function nextRoomPinVersion(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
): Promise<number> {
  const versionKey = buildRoomPinVersionKey(organizationId, roomId);
  const localCurrent = localRoomPinVersionFallbackMap.get(versionKey) || 0;

  try {
    let next = toRoomPinVersionNumber(await this.redis.incr(versionKey));
    if (next > 0) {
      if (next <= localCurrent) {
        next = await ensureRedisRoomPinVersionAtLeast.call(
          this,
          versionKey,
          localCurrent + 1,
        );
      } else if (next === 1) {
        await this.redis.expire(versionKey, ROOM_PIN_VERSION_KEY_TTL_SECONDS);
      }

      syncLocalRoomPinVersion(versionKey, next);
      return next;
    }
  } catch {
    // ignore redis failures and fallback to local monotonic state
  }

  return nextLocalRoomPinVersion(versionKey);
}

async function ensureRedisRoomPinVersionAtLeast(
  this: ChatBoxServiceDelegateContext,
  versionKey: string,
  minVersion: number,
): Promise<number> {
  const result = await this.redis.eval(
    [
      "local current = tonumber(redis.call('GET', KEYS[1]) or '0')",
      "local minimum = tonumber(ARGV[1])",
      "local ttl = tonumber(ARGV[2])",
      "if current < minimum then",
      "  redis.call('SET', KEYS[1], minimum, 'EX', ttl)",
      '  return minimum',
      'end',
      "redis.call('EXPIRE', KEYS[1], ttl)",
      'return current',
    ].join('\n'),
    1,
    versionKey,
    String(minVersion),
    String(ROOM_PIN_VERSION_KEY_TTL_SECONDS),
  );
  return toRoomPinVersionNumber(result);
}
