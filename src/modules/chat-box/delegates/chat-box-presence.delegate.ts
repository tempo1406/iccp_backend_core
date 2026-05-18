/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { CacheService } from '@modules/cache/cache.service';
import {
  CHAT_BOX_EVENTS,
  ChatPresenceUpdatedDomainEvent,
} from '@modules/chat-box/delegates/constants/chat-box-events.constant';
import { ChatLinkPreviewService } from '@modules/chat-box/link-preview/chat-link-preview.service';
import {
  ChatAttachmentDocumentType,
  ChatAttachmentPreviewStatus,
  ChatMessageAttachment,
} from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ChatMessageMention } from '@modules/chat-box/message-management/entities/message-mention.entity';
import { ChatMessagePin } from '@modules/chat-box/message-management/entities/message-pin.entity';
import { ChatMessageReaction } from '@modules/chat-box/message-management/entities/message-reaction.entity';
import {
  ChatMessage,
  ChatMessageType,
} from '@modules/chat-box/message-management/entities/message.entity';
import { ChatReadState } from '@modules/chat-box/message-management/entities/read-state.entity';
import { UpdateMyPresenceRequest } from '@modules/chat-box/presence/dto/request/update-my-presence.request';
import { PresenceResponse } from '@modules/chat-box/presence/dto/response/presence.response';
import {
  ChatPresenceStatus,
  ChatUserPresence,
} from '@modules/chat-box/presence/entities/user-presence.entity';
import { RoomPermissionResponse } from '@modules/chat-box/room-management/dto/response/room-permission.response';
import { ChatRoomInvitation } from '@modules/chat-box/room-management/entities/room-invitation.entity';
import { ChatRoomMember } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ChatRoomTabConfig } from '@modules/chat-box/room-management/entities/room-tab-config.entity';
import { ChatRoom } from '@modules/chat-box/room-management/entities/room.entity';
import { ImageKitService } from '@modules/imagekit/imagekit.service';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { User } from '@modules/users/entities/user.entity';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, In, Repository } from 'typeorm';

type RoomAccessContext = {
  room: ChatRoom;
  member: ChatRoomMember;
  permissions: RoomPermissionResponse;
};

type RawRoomMessageRow = {
  id: string;
  roomId: string;
  organizationId: string;
  senderId?: string;
  messageType: ChatMessageType;
  content?: string;
  metadata?: Record<string, any>;
  clientMessageId?: string;
  parentMessageId?: string;
  threadRootMessageId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  sentAt: Date;
  senderEmail?: string;
  senderFirstName?: string;
  senderLastName?: string;
  senderAvatarUrl?: string;
  replyMessageId?: string;
  replyContent?: string;
  replySentAt?: Date;
  replySenderId?: string;
  replySenderEmail?: string;
  replySenderFirstName?: string;
  replySenderLastName?: string;
  replySenderAvatarUrl?: string;
  replyIsDeleted?: boolean;
};

type AttachmentPreviewSeed = {
  documentType: ChatAttachmentDocumentType;
  previewStatus: ChatAttachmentPreviewStatus;
  thumbnailUrl?: string;
  previewUrl?: string;
  previewWidth?: number;
  previewHeight?: number;
  previewPage?: number;
  pageCount?: number;
  previewErrorCode?: string;
  previewUpdatedAt?: Date;
  shouldEnqueue: boolean;
};

type AttachmentPreviewJob = {
  organizationId: string;
  roomId: string;
  messageId: string;
  attachmentId: string;
  actorUserId: string;
  attempt: number;
  runAfter: number;
};

type AttachmentPreviewResult = {
  thumbnailUrl?: string;
  previewUrl?: string;
  previewWidth?: number;
  previewHeight?: number;
  previewPage?: number;
  pageCount?: number;
};

type AttachmentPreviewErrorResolution = {
  code: string;
  permanent: boolean;
};

type ChatBoxServiceDelegateContext = {
  roomRepo: Repository<ChatRoom>;
  roomTabConfigRepo: Repository<ChatRoomTabConfig>;
  roomMemberRepo: Repository<ChatRoomMember>;
  invitationRepo: Repository<ChatRoomInvitation>;
  messageRepo: Repository<ChatMessage>;
  attachmentRepo: Repository<ChatMessageAttachment>;
  pinRepo: Repository<ChatMessagePin>;
  readStateRepo: Repository<ChatReadState>;
  reactionRepo: Repository<ChatMessageReaction>;
  mentionRepo: Repository<ChatMessageMention>;
  presenceRepo: Repository<ChatUserPresence>;
  organizationRepo: Repository<Organization>;
  organizationMemberRepo: Repository<OrganizationMember>;
  userRepo: Repository<User>;
  imagekitService: ImageKitService;
  notificationService: NotificationCoreService;
  cacheService: CacheService;
  chatLinkPreviewService: ChatLinkPreviewService;
  eventEmitter: EventEmitter2;
  dataSource: DataSource;
  logger: Logger;
  attachmentPreviewQueue: AttachmentPreviewJob[];
  attachmentPreviewDeadLetter: AttachmentPreviewJob[];
  attachmentPreviewWorkerTimer?: NodeJS.Timeout;
  attachmentPreviewMetricsTimer?: NodeJS.Timeout;
  attachmentPreviewWorkerBusy: boolean;
  attachmentPreviewResultCache: Map<
    string,
    {
      result: AttachmentPreviewResult;
      expiresAt: number;
    }
  >;
  attachmentPreviewMetrics: {
    queued: number;
    processed: number;
    failed: number;
    retried: number;
    deadLettered: number;
    cacheHits: number;
    cacheMisses: number;
  };
  constructor: any;
  [key: string]: any;
};

export async function updateMyPresence(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  dto: UpdateMyPresenceRequest,
): Promise<PresenceResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const now = new Date();
  let presence = await this.presenceRepo.findOne({
    where: { organizationId, userId },
  });

  if (!presence) {
    presence = this.presenceRepo.create({
      organizationId,
      userId,
      presenceStatus: dto.presenceStatus,
      customStatus: dto.customStatus?.trim(),
      customEmoji: dto.customEmoji?.trim(),
      source: dto.source?.trim(),
      lastActivityAt: now,
      lastSeenAt:
        dto.presenceStatus === ChatPresenceStatus.OFFLINE ? now : undefined,
    });
  } else {
    presence.presenceStatus = dto.presenceStatus;
    presence.customStatus = dto.customStatus?.trim();
    presence.customEmoji = dto.customEmoji?.trim();
    presence.source = dto.source?.trim();
    presence.lastActivityAt = now;
    if (dto.presenceStatus === ChatPresenceStatus.OFFLINE) {
      presence.lastSeenAt = now;
    }
  }

  const saved = await this.presenceRepo.save(presence);
  const user = await this.userRepo.findOne({ where: { id: userId } });
  const response = this.toPresenceResponse(saved, user || undefined);
  const event: ChatPresenceUpdatedDomainEvent = {
    organizationId,
    actorUserId: userId,
    presence: response,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.PRESENCE_UPDATED, event);

  return response;
}
export async function listOrganizationPresence(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
): Promise<PresenceResponse[]> {
  await this.assertActiveOrgMember(organizationId, userId);

  const rows = await this.presenceRepo
    .createQueryBuilder('p')
    .innerJoin(
      OrganizationMember,
      'om',
      'om.organization_id = p.organization_id AND om.user_id = p.user_id AND om.is_active = true AND om.is_deleted = false',
    )
    .leftJoin(User, 'u', 'u.id = p.user_id')
    .where('p.organization_id = :organizationId', { organizationId })
    .select([
      'p.user_id AS "userId"',
      'p.organization_id AS "organizationId"',
      'p.presence_status AS "presenceStatus"',
      'p.custom_status AS "customStatus"',
      'p.custom_emoji AS "customEmoji"',
      'p.source AS "source"',
      'p.last_seen_at AS "lastSeenAt"',
      'p.last_activity_at AS "lastActivityAt"',
      'p.updated_at AS "updatedAt"',
      'u.email AS "email"',
      'u.first_name AS "firstName"',
      'u.last_name AS "lastName"',
    ])
    .orderBy('p.updated_at', 'DESC')
    .getRawMany<PresenceResponse>();

  return this.applyAutoAwayPresenceRows(organizationId, rows);
}
export async function handleSocketConnected(
  this: ChatBoxServiceDelegateContext,
  userId: string,
): Promise<void> {
  await this.updatePresenceFromSocketLifecycle(
    userId,
    ChatPresenceStatus.ONLINE,
  );
}
export async function handleSocketDisconnected(
  this: ChatBoxServiceDelegateContext,
  userId: string,
): Promise<void> {
  await this.updatePresenceFromSocketLifecycle(
    userId,
    ChatPresenceStatus.OFFLINE,
  );
}
export async function updatePresenceFromSocketLifecycle(
  this: ChatBoxServiceDelegateContext,
  userId: string,
  lifecycleStatus: ChatPresenceStatus.ONLINE | ChatPresenceStatus.OFFLINE,
): Promise<void> {
  const organizationIds = await this.getActiveOrganizationIdsByUser(userId);
  if (organizationIds.length === 0) {
    return;
  }

  const user = await this.userRepo.findOne({ where: { id: userId } });
  const now = new Date();
  const existingPresences = await this.presenceRepo.find({
    where: {
      userId,
      organizationId: In(organizationIds),
    },
  });
  const presenceByOrg = new Map(
    existingPresences.map((presence) => [presence.organizationId, presence]),
  );

  for (const organizationId of organizationIds) {
    const existing = presenceByOrg.get(organizationId);
    let nextPresence: ChatUserPresence;
    let shouldEmit = false;

    if (!existing) {
      nextPresence = this.presenceRepo.create({
        organizationId,
        userId,
        presenceStatus: lifecycleStatus,
        source: 'socket',
        lastActivityAt: now,
        lastSeenAt:
          lifecycleStatus === ChatPresenceStatus.OFFLINE ? now : undefined,
      });
      shouldEmit = true;
    } else {
      nextPresence = existing;
      nextPresence.source = 'socket';
      nextPresence.lastActivityAt = now;

      if (lifecycleStatus === ChatPresenceStatus.ONLINE) {
        if (existing.presenceStatus === ChatPresenceStatus.OFFLINE) {
          nextPresence.presenceStatus = ChatPresenceStatus.ONLINE;
          shouldEmit = true;
        }
      } else {
        if (existing.presenceStatus !== ChatPresenceStatus.OFFLINE) {
          shouldEmit = true;
        }
        nextPresence.presenceStatus = ChatPresenceStatus.OFFLINE;
        nextPresence.lastSeenAt = now;
      }
    }

    const saved = await this.presenceRepo.save(nextPresence);
    if (shouldEmit) {
      const response = this.toPresenceResponse(saved, user || undefined);
      const event: ChatPresenceUpdatedDomainEvent = {
        organizationId,
        actorUserId: userId,
        presence: response,
        occurredAt: new Date().toISOString(),
      };
      this.eventEmitter.emit(CHAT_BOX_EVENTS.PRESENCE_UPDATED, event);
    }
  }
}
export async function getActiveOrganizationIdsByUser(
  this: ChatBoxServiceDelegateContext,
  userId: string,
): Promise<string[]> {
  const memberships = await this.organizationMemberRepo.find({
    where: {
      userId,
      isActive: true,
      isDeleted: false,
    },
    select: ['organizationId'],
  });

  return Array.from(
    new Set(memberships.map((membership) => membership.organizationId)),
  );
}
export async function applyAutoAwayPresenceRows(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  rows: PresenceResponse[],
): Promise<PresenceResponse[]> {
  const now = Date.now();
  const normalized = [...rows];

  for (let index = 0; index < normalized.length; index += 1) {
    const row = normalized[index];
    if (row.presenceStatus !== ChatPresenceStatus.ONLINE) {
      continue;
    }
    if (!row.lastActivityAt) {
      continue;
    }

    const idleMs = now - new Date(row.lastActivityAt).getTime();
    if (idleMs < this.constructor.AUTO_AWAY_IDLE_MS) {
      continue;
    }

    normalized[index] = {
      ...row,
      presenceStatus: ChatPresenceStatus.AWAY,
    };

    await this.presenceRepo.update(
      {
        organizationId,
        userId: row.userId,
      },
      {
        presenceStatus: ChatPresenceStatus.AWAY,
        source: 'auto-away',
      },
    );

    const event: ChatPresenceUpdatedDomainEvent = {
      organizationId,
      actorUserId: row.userId,
      presence: normalized[index],
      occurredAt: new Date().toISOString(),
    };
    this.eventEmitter.emit(CHAT_BOX_EVENTS.PRESENCE_UPDATED, event);
  }

  return normalized;
}
export function toPresenceResponse(
  this: ChatBoxServiceDelegateContext,
  presence: ChatUserPresence,
  user?: User,
): PresenceResponse {
  return {
    userId: presence.userId,
    organizationId: presence.organizationId,
    presenceStatus: presence.presenceStatus,
    customStatus: presence.customStatus,
    customEmoji: presence.customEmoji,
    source: presence.source,
    lastSeenAt: presence.lastSeenAt,
    lastActivityAt: presence.lastActivityAt,
    updatedAt: presence.updatedAt,
    email: user?.email,
    firstName: user?.firstName,
    lastName: user?.lastName,
  };
}
