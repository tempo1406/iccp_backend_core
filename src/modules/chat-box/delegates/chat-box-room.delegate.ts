/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-return */
import { PaginatedResponse } from '@common/dto/paginated.response';
import { PaginationHelper } from '@common/helpers/pagination.helper';
import { CacheService } from '@modules/cache/cache.service';
import { ChatScopeAccessPolicyService } from '@modules/chat-box/policies/chat-scope-access-policy.service';
import { isOrganizationAnnouncementsRoomKey } from '@modules/chat-box/bootstrap/constants/chat-default-room.constant';
import {
  CHAT_BOX_EVENTS,
  ChatMessageDomainEvent,
  ChatRoomInvitationsCreatedDomainEvent,
  ChatRoomMemberJoinedDomainEvent,
  ChatRoomMemberRemovedDomainEvent,
  ChatRoomMemberRoleUpdatedDomainEvent,
  ChatRoomUpdatedDomainEvent,
  ChatRoomVisibilityChangedDomainEvent,
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
import { ChatUserPresence } from '@modules/chat-box/presence/entities/user-presence.entity';
import { CreateRoomRequest } from '@modules/chat-box/room-management/dto/request/create-room.request';
import {
  DiscoverPublicRoomsQueryRequest,
  DiscoverPublicRoomsSortBy,
} from '@modules/chat-box/room-management/dto/request/discover-public-rooms-query.request';
import { GetRoomBootstrapQueryRequest } from '@modules/chat-box/room-management/dto/request/get-room-bootstrap-query.request';
import { GetCreateRoomCandidatesQueryRequest } from '@modules/chat-box/room-management/dto/request/get-create-room-candidates-query.request';
import { GetInviteCandidatesQueryRequest } from '@modules/chat-box/room-management/dto/request/get-invite-candidates-query.request';
import { InviteRoomMembersRequest } from '@modules/chat-box/room-management/dto/request/invite-room-members.request';
import { ListRoomsQueryRequest } from '@modules/chat-box/room-management/dto/request/list-rooms-query.request';
import { UpdateRoomOwnershipRequest } from '@modules/chat-box/room-management/dto/request/update-room-ownership.request';
import { UpdateRoomInfoRequest } from '@modules/chat-box/room-management/dto/request/update-room-info.request';
import { UpdateRoomVisibilityRequest } from '@modules/chat-box/room-management/dto/request/update-room-visibility.request';
import { UpdateRoomMemberRoleRequest } from '@modules/chat-box/room-management/dto/request/update-room-member-role.request';
import { UpdateRoomPoliciesRequest } from '@modules/chat-box/room-management/dto/request/update-room-policies.request';
import { UpdateRoomTabsRequest } from '@modules/chat-box/room-management/dto/request/update-room-tabs.request';
import { AcceptInvitationResponse } from '@modules/chat-box/room-management/dto/response/accept-invitation.response';
import {
  CreateRoomCandidateItemResponse,
  CreateRoomCandidatesResponse,
} from '@modules/chat-box/room-management/dto/response/create-room-candidate.response';
import { DiscoverPublicRoomsResponse } from '@modules/chat-box/room-management/dto/response/discover-public-rooms.response';
import { JoinRoomResponse } from '@modules/chat-box/room-management/dto/response/join-room.response';
import { RoomBootstrapResponse } from '@modules/chat-box/room-management/dto/response/room-bootstrap.response';
import { RoomDetailResponse } from '@modules/chat-box/room-management/dto/response/room-detail.response';
import { RoomInvitationResponse } from '@modules/chat-box/room-management/dto/response/room-invitation.response';
import {
  RoomInviteCandidateItemResponse,
  RoomInviteCandidatesResponse,
} from '@modules/chat-box/room-management/dto/response/room-invite-candidate.response';
import { RoomMemberResponse } from '@modules/chat-box/room-management/dto/response/room-member.response';
import { RoomPermissionResponse } from '@modules/chat-box/room-management/dto/response/room-permission.response';
import { RoomPreviewResponse } from '@modules/chat-box/room-management/dto/response/room-preview.response';
import { RoomSummaryResponse } from '@modules/chat-box/room-management/dto/response/room-summary.response';
import { RoomTabsResponse } from '@modules/chat-box/room-management/dto/response/room-tabs.response';
import { RemoveRoomMemberResponse } from '@modules/chat-box/room-management/dto/response/remove-room-member.response';
import {
  ChatRoomViewerMembershipStatus,
  RoomViewerStateResponse,
} from '@modules/chat-box/room-management/dto/response/room-viewer-state.response';
import { UpdateRoomArchiveResponse } from '@modules/chat-box/room-management/dto/response/update-room-archive.response';
import { UpdateRoomInfoResponse } from '@modules/chat-box/room-management/dto/response/update-room-info.response';
import { UpdateRoomMemberRoleResponse } from '@modules/chat-box/room-management/dto/response/update-room-member-role.response';
import { UpdateRoomOwnershipResponse } from '@modules/chat-box/room-management/dto/response/update-room-ownership.response';
import { UpdateRoomPoliciesResponse } from '@modules/chat-box/room-management/dto/response/update-room-policies.response';
import { UpdateRoomVisibilityResponse } from '@modules/chat-box/room-management/dto/response/update-room-visibility.response';
import { UpdateRoomStarResponse } from '@modules/chat-box/room-management/dto/response/update-room-star.response';
import {
  ChatRoomInvitation,
  ChatRoomInvitationStatus,
} from '@modules/chat-box/room-management/entities/room-invitation.entity';
import {
  ChatHiddenReason,
  ChatJoinSource,
  ChatMemberRole,
  ChatNotifyLevel,
  ChatRoomMember,
} from '@modules/chat-box/room-management/entities/room-member.entity';
import {
  ChatRoomTabConfig,
  ChatRoomTabConfigItem,
} from '@modules/chat-box/room-management/entities/room-tab-config.entity';
import {
  ChatContextScope,
  ChatRoom,
  ChatRoomType,
  ChatRoomVisibility,
} from '@modules/chat-box/room-management/entities/room.entity';
import { ImageKitService } from '@modules/imagekit/imagekit.service';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, In, Repository, SelectQueryBuilder } from 'typeorm';

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
  chatScopeAccessPolicyService: ChatScopeAccessPolicyService;
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

const LIST_MY_ROOMS_CACHE_TTL_MS = 5_000;
const DISCOVER_PUBLIC_ROOMS_CACHE_TTL_MS = 5_000;
const ROOM_PREVIEW_CACHE_TTL_MS = 5_000;
const ROOM_BOOTSTRAP_CACHE_TTL_MS = 3_000;
const ROOM_STATE_CACHE_VERSION_TTL_MS = 7 * 24 * 60 * 60_000;
const USER_ROOMS_STATE_CACHE_VERSION_KEY_PREFIX =
  'chat:user-rooms-state-version:v1';
const USER_ROOM_STATE_CACHE_VERSION_KEY_PREFIX =
  'chat:user-room-state-version:v1';

export function applyAccessibleRoomScopePredicate(
  this: ChatBoxServiceDelegateContext,
  params: {
    qb: SelectQueryBuilder<ChatRoom>;
    roomAlias: string;
    organizationId: string;
    userId: string;
  },
): void {
  const { qb, roomAlias, organizationId, userId } = params;

  qb.leftJoin(
    Project,
    'project_scope',
    [
      `project_scope.id = ${roomAlias}.context_id`,
      'project_scope.organization_id = :organizationId',
      'project_scope.deleted_at IS NULL',
    ].join(' AND '),
    { organizationId },
  ).leftJoin(
    ProjectMember,
    'project_scope_member',
    [
      'project_scope_member.project_id = project_scope.id',
      'project_scope_member.organization_id = :organizationId',
      'project_scope_member.user_id = :userId',
      'project_scope_member.is_active = true',
      'project_scope_member.deleted_at IS NULL',
    ].join(' AND '),
    { organizationId, userId },
  );

  qb.andWhere(
    [
      '(',
      `${roomAlias}.context_scope = :organizationScope`,
      'OR (',
      `${roomAlias}.context_scope = :projectScope AND project_scope.id IS NOT NULL AND (`,
      'project_scope.created_by = :userId',
      'OR :userId = ANY(COALESCE(project_scope.manager_id, ARRAY[]::uuid[]))',
      'OR project_scope_member.id IS NOT NULL',
      '))',
      ')',
    ].join(' '),
    {
      organizationScope: ChatContextScope.ORGANIZATION,
      projectScope: ChatContextScope.PROJECT,
      userId,
    },
  );
}

export function applyDiscoverPublicRoomMemberCountStrategy(
  this: ChatBoxServiceDelegateContext,
  params: {
    qb: SelectQueryBuilder<ChatRoom>;
    roomAlias: string;
    sortBy: DiscoverPublicRoomsSortBy;
  },
): void {
  const { qb, roomAlias, sortBy } = params;
  if (sortBy === DiscoverPublicRoomsSortBy.MEMBERS) {
    qb.leftJoin(
      (subQuery) =>
        subQuery
          .select('member_count.room_id', 'room_id')
          .addSelect('COUNT(*)', 'member_count')
          .from(ChatRoomMember, 'member_count')
          .where('member_count.organization_id = :organizationId')
          .andWhere('member_count.is_active = true')
          .groupBy('member_count.room_id'),
      'room_member_counts',
      `room_member_counts.room_id = ${roomAlias}.id`,
    ).addSelect('COALESCE(room_member_counts.member_count, 0)', 'memberCount');
    return;
  }

  qb.addSelect(
    (subQuery) =>
      subQuery
        .select('COUNT(*)')
        .from(ChatRoomMember, 'member_count')
        .where('member_count.organization_id = :organizationId')
        .andWhere(`member_count.room_id = ${roomAlias}.id`)
        .andWhere('member_count.is_active = true'),
    'memberCount',
  );
}

export async function buildRoomRealtimeSnapshot(
  this: ChatBoxServiceDelegateContext,
  room: ChatRoom,
): Promise<ChatRoomUpdatedDomainEvent['room']> {
  const memberCountMap = await this.getActiveMemberCountMap([room.id]);
  return {
    id: room.id,
    roomType: room.roomType,
    visibility: room.visibility,
    name: room.name,
    roomKey: room.roomKey,
    topic: room.topic,
    description: room.description,
    memberCount: memberCountMap.get(room.id) || 0,
    isArchived: room.isArchived,
    allowMemberPinMessages: room.allowMemberPinMessages,
    allowGuestPinMessages: room.allowGuestPinMessages,
    ownerId: room.ownerId,
    updatedAt: room.updatedAt.toISOString(),
  };
}

export async function emitRoomUpdatedEvent(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    updatedByUserId: string;
    changeType: ChatRoomUpdatedDomainEvent['changeType'];
    previousOwnerUserId?: string;
    currentOwnerUserId?: string;
    room?: ChatRoom;
  },
): Promise<void> {
  const room =
    params.room ??
    (await this.roomRepo.findOne({
      where: { id: params.roomId, organizationId: params.organizationId },
    }));
  if (!room) {
    return;
  }

  const event: ChatRoomUpdatedDomainEvent = {
    organizationId: params.organizationId,
    roomId: room.id,
    roomType: room.roomType,
    updatedByUserId: params.updatedByUserId,
    updatedAt: room.updatedAt.toISOString(),
    changeType: params.changeType,
    room: await this.buildRoomRealtimeSnapshot(room),
    previousOwnerUserId: params.previousOwnerUserId,
    currentOwnerUserId: params.currentOwnerUserId,
  };
  await this.bumpRoomMemberRoomsStateVersions({
    organizationId: params.organizationId,
    roomId: room.id,
  });
  this.eventEmitter.emit(CHAT_BOX_EVENTS.ROOM_UPDATED, event);
}

function buildListMyRoomsCacheKey(params: {
  organizationId: string;
  userId: string;
  stateVersion: number;
  query: ListRoomsQueryRequest;
  scopeFilter: {
    contextScope?: ChatContextScope;
    contextId?: string;
  };
}): string {
  const normalizedQuery = {
    page: params.query.page ?? 1,
    limit: params.query.limit ?? 20,
    sortBy: params.query.sortBy ?? undefined,
    sortOrder: params.query.sortOrder ?? undefined,
    roomType: params.query.roomType ?? undefined,
    visibility: params.query.visibility ?? undefined,
    includeArchived: params.query.includeArchived ?? undefined,
    includeHidden: params.query.includeHidden ?? undefined,
    search: params.query.search?.trim() || undefined,
    contextScope: params.scopeFilter.contextScope ?? undefined,
    contextId: params.scopeFilter.contextId ?? undefined,
    stateVersion: params.stateVersion,
  };

  return `chat:list-my-rooms:v1:${params.organizationId}:${params.userId}:${JSON.stringify(normalizedQuery)}`;
}

function buildDiscoverPublicRoomsCacheKey(params: {
  organizationId: string;
  userId: string;
  query: DiscoverPublicRoomsQueryRequest;
  scopeFilter: {
    contextScope?: ChatContextScope;
    contextId?: string;
  };
}): string {
  const normalizedQuery = {
    limit: params.query.limit ?? 20,
    sortBy: params.query.sortBy ?? DiscoverPublicRoomsSortBy.RECENT,
    cursor: params.query.cursor ?? undefined,
    search: params.query.search?.trim() || undefined,
    contextScope: params.scopeFilter.contextScope ?? undefined,
    contextId: params.scopeFilter.contextId ?? undefined,
  };

  return `chat:discover-public-rooms:v1:${params.organizationId}:${params.userId}:${JSON.stringify(normalizedQuery)}`;
}

function buildRoomPreviewCacheKey(params: {
  organizationId: string;
  roomId: string;
  userId: string;
}): string {
  return `chat:room-preview:v1:${params.organizationId}:${params.roomId}:${params.userId}`;
}

function buildRoomBootstrapCacheKey(params: {
  organizationId: string;
  roomId: string;
  userId: string;
  stateVersion: number;
  query: {
    includeMembers?: boolean;
    messageLimit: number;
    pinnedLimit: number;
  };
}): string {
  const normalizedQuery = {
    includeMembers: params.query.includeMembers ?? false,
    messageLimit: params.query.messageLimit,
    pinnedLimit: params.query.pinnedLimit,
    stateVersion: params.stateVersion,
  };
  return `chat:room-bootstrap:v1:${params.organizationId}:${params.roomId}:${params.userId}:${JSON.stringify(normalizedQuery)}`;
}

export function buildUserRoomsStateCacheVersionKey(params: {
  organizationId: string;
  userId: string;
}): string {
  return `${USER_ROOMS_STATE_CACHE_VERSION_KEY_PREFIX}:${params.organizationId}:${params.userId}`;
}

export function buildUserRoomStateCacheVersionKey(params: {
  organizationId: string;
  roomId: string;
  userId: string;
}): string {
  return `${USER_ROOM_STATE_CACHE_VERSION_KEY_PREFIX}:${params.organizationId}:${params.roomId}:${params.userId}`;
}

export async function bumpUserRoomsStateVersions(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userIds: string[],
): Promise<void> {
  const normalizedUserIds = Array.from(
    new Set(
      userIds
        .map((userId) => userId?.trim())
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );
  if (normalizedUserIds.length === 0) {
    return;
  }

  await Promise.all(
    normalizedUserIds.map((userId) =>
      this.bumpCacheVersionNumber(
        buildUserRoomsStateCacheVersionKey({
          organizationId,
          userId,
        }),
      ),
    ),
  );
}

export async function bumpRoomMemberRoomsStateVersions(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    extraUserIds?: string[];
  },
): Promise<void> {
  const activeMembers = await this.roomMemberRepo.find({
    where: {
      organizationId: params.organizationId,
      roomId: params.roomId,
      isActive: true,
    },
    select: ['userId'],
  });

  await this.bumpUserRoomsStateVersions(params.organizationId, [
    ...activeMembers.map((member) => member.userId),
    ...(params.extraUserIds ?? []),
  ]);
}

export async function getCacheVersionNumber(
  this: ChatBoxServiceDelegateContext,
  key: string,
): Promise<number> {
  const raw = await this.cacheService.get<number | string>(key);
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }
  return 0;
}

export async function bumpCacheVersionNumber(
  this: ChatBoxServiceDelegateContext,
  key: string,
): Promise<number> {
  const current = await this.getCacheVersionNumber(key);
  const next = current + 1;
  await this.cacheService.set(key, next, ROOM_STATE_CACHE_VERSION_TTL_MS);
  return next;
}

export async function createRoom(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  dto: CreateRoomRequest,
): Promise<RoomDetailResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const roomType = dto.roomType ?? ChatRoomType.CHANNEL;
  const requestedVisibility = dto.visibility ?? ChatRoomVisibility.PUBLIC;
  const visibility =
    roomType === ChatRoomType.CHANNEL
      ? requestedVisibility
      : ChatRoomVisibility.PRIVATE;
  const defaultPolicies = this.buildDefaultRoomPolicies(roomType);
  const name = dto.name?.trim();

  if (roomType === ChatRoomType.CHANNEL && !name) {
    throw new BadRequestException('Channel name is required');
  }

  const resolvedScope =
    await this.chatScopeAccessPolicyService.resolveCreateRoomScope(
      organizationId,
      userId,
      dto.contextScope,
      dto.contextId,
    );
  const contextScope = resolvedScope.contextScope;
  const contextId = resolvedScope.contextId;

  const dedupedMemberIds = Array.from(new Set(dto.memberIds || []));
  let requestedMemberIds: string[] = dedupedMemberIds.filter(
    (id) => id !== userId,
  );
  let dmTargetMemberId: string | undefined;

  if (roomType === ChatRoomType.DM) {
    if (dedupedMemberIds.length > 1) {
      throw new BadRequestException(
        'DM room requires exactly one target member or self',
      );
    }
    if (dedupedMemberIds.length === 1 && dedupedMemberIds[0] !== userId) {
      dmTargetMemberId = dedupedMemberIds[0];
    }
    requestedMemberIds = dmTargetMemberId ? [dmTargetMemberId] : [];
  }

  await this.ensureUsersAreActiveOrgMembers(organizationId, requestedMemberIds);
  await this.chatScopeAccessPolicyService.assertUsersCanJoinRoomScope(
    {
      organizationId,
      contextScope,
      contextId,
    },
    requestedMemberIds,
  );

  const desiredRoomKey = this.buildRequestedRoomKey({
    roomType,
    roomKey: dto.roomKey,
    name,
    contextScope,
    contextId,
    ownerId: userId,
    requestedMemberIds,
  });

  if (roomType === ChatRoomType.DM && desiredRoomKey) {
    const existingDmRoom = await this.roomRepo.findOne({
      where: {
        organizationId,
        roomType: ChatRoomType.DM,
        contextScope,
        contextId,
        roomKey: desiredRoomKey,
      },
    });
    if (existingDmRoom) {
      await this.ensureDmMemberships(
        organizationId,
        existingDmRoom.id,
        userId,
        dmTargetMemberId,
      );
      return this.getRoomDetail(organizationId, existingDmRoom.id, userId);
    }
  }

  const roomKey =
    desiredRoomKey && desiredRoomKey.length > 0
      ? await this.resolveUniqueRoomKey(organizationId, desiredRoomKey)
      : undefined;

  const createdRoom = await this.dataSource.transaction(async (manager) => {
    const room = manager.create(ChatRoom, {
      organizationId,
      roomType,
      visibility,
      name,
      roomKey,
      topic: dto.topic?.trim(),
      description: dto.description?.trim(),
      contextScope,
      contextId,
      createdBy: userId,
      ownerId: userId,
      allowMemberPinMessages: defaultPolicies.allowMemberPinMessages,
      allowGuestPinMessages: defaultPolicies.allowGuestPinMessages,
    });
    const savedRoom = await manager.save(room);

    const ownerMember = manager.create(ChatRoomMember, {
      organizationId,
      roomId: savedRoom.id,
      userId,
      memberRole: ChatMemberRole.OWNER,
      joinSource: ChatJoinSource.MANUAL,
      isActive: true,
    });
    await manager.save(ownerMember);

    if (requestedMemberIds.length > 0) {
      const members = requestedMemberIds.map((memberId) =>
        manager.create(ChatRoomMember, {
          organizationId,
          roomId: savedRoom.id,
          userId: memberId,
          memberRole: ChatMemberRole.MEMBER,
          joinSource: ChatJoinSource.MANUAL,
          isActive: true,
        }),
      );
      await manager.save(members);
    }

    return savedRoom;
  });

  await this.bumpUserRoomsStateVersions(organizationId, [
    userId,
    ...requestedMemberIds,
  ]);
  await this.emitRoomUpdatedEvent({
    organizationId,
    roomId: createdRoom.id,
    updatedByUserId: userId,
    changeType: 'room_info',
    room: createdRoom,
  });

  return this.getRoomDetail(organizationId, createdRoom.id, userId);
}
export async function listMyRooms(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  query: ListRoomsQueryRequest,
): Promise<PaginatedResponse<RoomSummaryResponse>> {
  await this.assertActiveOrgMember(organizationId, userId);
  const scopeFilter =
    await this.chatScopeAccessPolicyService.validateRoomScopeFilter(
      organizationId,
      userId,
      {
        contextScope: query.contextScope,
        contextId: query.contextId,
      },
    );
  const roomStateVersion = await this.getCacheVersionNumber(
    buildUserRoomsStateCacheVersionKey({
      organizationId,
      userId,
    }),
  );
  const listCacheKey = buildListMyRoomsCacheKey({
    organizationId,
    userId,
    stateVersion: roomStateVersion,
    query,
    scopeFilter,
  });
  const cachedList =
    await this.cacheService.get<PaginatedResponse<RoomSummaryResponse>>(
      listCacheKey,
    );
  if (cachedList) {
    return cachedList;
  }

  const qb = this.roomRepo
    .createQueryBuilder('r')
    .innerJoin(
      ChatRoomMember,
      'rm',
      'rm.room_id = r.id AND rm.organization_id = :organizationId AND rm.user_id = :userId AND rm.is_active = true',
      { organizationId, userId },
    )
    .leftJoin(User, 'creator', 'creator.id = r.created_by')
    .leftJoin(User, 'archiver', 'archiver.id = r.archived_by_user_id')
    .where('r.organization_id = :organizationId', { organizationId });

  applyAccessibleRoomScopePredicate.call(this, {
    qb,
    roomAlias: 'r',
    organizationId,
    userId,
  });

  if (scopeFilter.contextScope) {
    qb.andWhere('r.context_scope = :filterContextScope', {
      filterContextScope: scopeFilter.contextScope,
    });
  }

  if (scopeFilter.contextId) {
    qb.andWhere('r.context_id = :filterContextId', {
      filterContextId: scopeFilter.contextId,
    });
  }

  if (query.archivedOnly) {
    qb.andWhere('r.is_archived = true');
  } else if (!query.includeArchived) {
    qb.andWhere('r.is_archived = false');
  }

  if (query.hiddenOnly) {
    qb.andWhere('rm.is_hidden = true');
  } else if (!query.includeHidden) {
    qb.andWhere('rm.is_hidden = false');
  }

  if (query.starredOnly) {
    qb.andWhere('rm.is_starred = true');
  }

  if (query.search) {
    qb.andWhere('(r.name ILIKE :search OR r.room_key ILIKE :search)', {
      search: `%${query.search}%`,
    });
  }

  if (query.roomType) {
    qb.andWhere('r.room_type = :roomType', { roomType: query.roomType });
  }

  if (query.visibility) {
    qb.andWhere('r.visibility = :visibility', {
      visibility: query.visibility,
    });
  }

  const total = await qb.getCount();

  const sortOrder = query.sortOrder ?? 'DESC';
  const recentSortExpression = 'COALESCE(r.last_message_at, r.updated_at)';
  const sortableFields: Record<string, string> = {
    createdAt: 'r.created_at',
    updatedAt: 'r.updated_at',
    name: 'r.name',
    lastMessageAt: 'r.last_message_at',
    starredAt: 'rm.starred_at',
  };
  const defaultSortBy = recentSortExpression;
  const sortBy = sortableFields[query.sortBy || ''] || defaultSortBy;
  const { skip, take } = PaginationHelper.getSkipAndTake(query);

  const rows = await qb
    .select([
      'r.id AS "id"',
      'r.organization_id AS "organizationId"',
      'r.room_type AS "roomType"',
      'r.visibility AS "visibility"',
      'r.name AS "name"',
      'r.room_key AS "roomKey"',
      'r.topic AS "topic"',
      'r.description AS "description"',
      'r.context_scope AS "contextScope"',
      'r.context_id AS "contextId"',
      'r.created_by AS "createdBy"',
      'creator.email AS "createdByEmail"',
      'creator.first_name AS "createdByFirstName"',
      'creator.last_name AS "createdByLastName"',
      'r.owner_id AS "ownerId"',
      'r.last_message_id AS "lastMessageId"',
      'r.last_message_at AS "lastMessageAt"',
      'r.is_archived AS "isArchived"',
      'r.archived_at AS "archivedAt"',
      'r.archived_by_user_id AS "archivedByUserId"',
      'archiver.email AS "archivedByEmail"',
      'archiver.first_name AS "archivedByFirstName"',
      'archiver.last_name AS "archivedByLastName"',
      'r.allow_member_pin_messages AS "allowMemberPinMessages"',
      'r.allow_guest_pin_messages AS "allowGuestPinMessages"',
      'r.created_at AS "createdAt"',
      'r.updated_at AS "updatedAt"',
      'rm.member_role AS "myRole"',
      'rm.notify_level AS "myNotifyLevel"',
      'rm.is_hidden AS "isHiddenByUser"',
      'rm.hidden_reason AS "hiddenReason"',
      'rm.hidden_at AS "hiddenAt"',
      'rm.is_starred AS "isStarred"',
      'rm.starred_at AS "starredAt"',
    ])
    .orderBy(sortBy, sortOrder)
    .addOrderBy('r.updated_at', sortOrder)
    .addOrderBy('r.id', sortOrder)
    .offset(skip)
    .limit(take)
    .getRawMany<
      RoomSummaryResponse & {
        createdByEmail?: string;
        createdByFirstName?: string;
        createdByLastName?: string;
        archivedByEmail?: string;
        archivedByFirstName?: string;
        archivedByLastName?: string;
        lastMessageId?: string;
      }
    >();

  const roomIds = rows.map((row) => row.id);
  const memberCountMap = await this.getActiveMemberCountMap(roomIds);
  const readStates =
    roomIds.length > 0
      ? await this.readStateRepo.find({
          where: {
            organizationId,
            userId,
            roomId: In(roomIds),
          },
          select: [
            'roomId',
            'isManualUnreadByUser',
            'manualUnreadAt',
            'manualUnreadFromMessageId',
          ],
        })
      : [];
  const readStateMap = new Map(
    readStates.map((state) => [state.roomId, state]),
  );
  const sidebarRoomIds = rows
    .filter(
      (row) =>
        row.roomType === ChatRoomType.DM ||
        row.roomType === ChatRoomType.GROUP_DM,
    )
    .map((row) => row.id);

  const sidebarMemberRows =
    sidebarRoomIds.length > 0
      ? await this.roomMemberRepo
          .createQueryBuilder('rm')
          .select('rm.room_id', 'roomId')
          .addSelect('rm.user_id', 'userId')
          .where('rm.organization_id = :organizationId', { organizationId })
          .andWhere('rm.room_id IN (:...sidebarRoomIds)', { sidebarRoomIds })
          .andWhere('rm.is_active = true')
          .orderBy('rm.joined_at', 'ASC')
          .addOrderBy('rm.user_id', 'ASC')
          .getRawMany<{ roomId: string; userId: string }>()
      : [];
  const sidebarMembersByRoom = new Map<string, string[]>();
  for (const row of sidebarMemberRows) {
    const list = sidebarMembersByRoom.get(row.roomId) || [];
    list.push(row.userId);
    sidebarMembersByRoom.set(row.roomId, list);
  }

  const sidebarUserIds = Array.from(
    new Set(
      sidebarMemberRows
        .map((row) => row.userId)
        .filter((memberUserId) => memberUserId !== userId),
    ),
  );
  const [sidebarUsers, presenceRows] = await Promise.all([
    sidebarUserIds.length > 0
      ? this.userRepo.find({
          where: {
            id: In(sidebarUserIds),
          },
          select: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
        })
      : Promise.resolve([] as User[]),
    sidebarUserIds.length > 0
      ? this.presenceRepo.find({
          where: {
            organizationId,
            userId: In(sidebarUserIds),
          },
          select: ['userId', 'presenceStatus', 'lastActivityAt'],
        })
      : Promise.resolve([] as ChatUserPresence[]),
  ]);
  const sidebarUserMap = new Map(
    sidebarUsers.map((member) => [member.id, member]),
  );
  const presenceMap = new Map(
    presenceRows.map((presence) => [presence.userId, presence]),
  );

  const lastMessageIds = Array.from(
    new Set(
      rows
        .map((row) => row.lastMessageId)
        .filter((messageId): messageId is string => Boolean(messageId)),
    ),
  );
  const lastMessages =
    lastMessageIds.length > 0
      ? await this.messageRepo.find({
          where: {
            organizationId,
            id: In(lastMessageIds),
          },
          select: ['id', 'content', 'messageType', 'isDeleted'],
        })
      : [];
  const lastMessageMap = new Map(
    lastMessages.map((message) => [message.id, message]),
  );

  const buildLastMessageSnippet = (
    message?: Pick<ChatMessage, 'content' | 'isDeleted' | 'messageType'>,
  ): string | undefined => {
    if (!message) {
      return undefined;
    }

    if (message.isDeleted) {
      return '[message was deleted]';
    }

    const content = message.content?.trim();
    if (content) {
      return content.length > 140 ? `${content.slice(0, 137)}...` : content;
    }

    if (message.messageType === ChatMessageType.IMAGE) {
      return '[image attachment]';
    }
    if (message.messageType === ChatMessageType.FILE) {
      return '[file attachment]';
    }
    if (message.messageType === ChatMessageType.EVENT) {
      return '[event message]';
    }
    if (message.messageType === ChatMessageType.SYSTEM) {
      return '[system message]';
    }
    return '[message]';
  };

  const items = rows.map((row) => {
    const {
      createdByEmail,
      createdByFirstName,
      createdByLastName,
      archivedByEmail,
      archivedByFirstName,
      archivedByLastName,
      lastMessageId,
      ...roomRow
    } = row;
    const readState = readStateMap.get(roomRow.id);

    const memberIds = sidebarMembersByRoom.get(roomRow.id) || [];
    const otherMemberIds = memberIds.filter(
      (memberUserId) => memberUserId !== userId,
    );
    let dmCounterpart: RoomSummaryResponse['dmCounterpart'];
    if (roomRow.roomType === ChatRoomType.DM && otherMemberIds.length > 0) {
      const counterpartUser = sidebarUserMap.get(otherMemberIds[0]);
      const counterpartPresence = presenceMap.get(otherMemberIds[0]);
      dmCounterpart = {
        userId: otherMemberIds[0],
        displayName: this.buildUserDisplayName({
          userId: otherMemberIds[0],
          email: counterpartUser?.email,
          firstName: counterpartUser?.firstName,
          lastName: counterpartUser?.lastName,
        }),
        email: counterpartUser?.email,
        firstName: counterpartUser?.firstName,
        lastName: counterpartUser?.lastName,
        avatarUrl: counterpartUser?.avatarUrl,
        presenceStatus: counterpartPresence?.presenceStatus,
        lastActivityAt: counterpartPresence?.lastActivityAt,
      };
    }

    const groupMemberPreview =
      roomRow.roomType === ChatRoomType.GROUP_DM
        ? otherMemberIds.slice(0, 3).map((memberUserId) => {
            const member = sidebarUserMap.get(memberUserId);
            return {
              userId: memberUserId,
              displayName: this.buildUserDisplayName({
                userId: memberUserId,
                email: member?.email,
                firstName: member?.firstName,
                lastName: member?.lastName,
              }),
              email: member?.email,
              firstName: member?.firstName,
              lastName: member?.lastName,
              avatarUrl: member?.avatarUrl,
            };
          })
        : undefined;

    const lastMessageSnippet = buildLastMessageSnippet(
      lastMessageId ? lastMessageMap.get(lastMessageId) : undefined,
    );
    const permissions = this.buildRoomPermissions(
      roomRow.myRole,
      roomRow.visibility,
      roomRow.roomType,
      roomRow.roomKey,
      roomRow.contextScope,
      roomRow.allowMemberPinMessages,
      roomRow.allowGuestPinMessages,
    );

    return {
      ...roomRow,
      name:
        roomRow.roomType === ChatRoomType.DM && !roomRow.name
          ? dmCounterpart?.displayName || roomRow.name
          : roomRow.name,
      lastMessageSnippet,
      createdByDisplayName: this.buildUserDisplayName({
        userId: roomRow.createdBy,
        email: createdByEmail,
        firstName: createdByFirstName,
        lastName: createdByLastName,
      }),
      archivedByDisplayName: roomRow.archivedByUserId
        ? this.buildUserDisplayName({
            userId: roomRow.archivedByUserId,
            email: archivedByEmail,
            firstName: archivedByFirstName,
            lastName: archivedByLastName,
          })
        : undefined,
      canUnarchive: permissions.canManageMembers && roomRow.isArchived,
      canUnhide: roomRow.isHiddenByUser,
      memberCount: memberCountMap.get(roomRow.id) || 0,
      isManualUnreadByUser: Boolean(readState?.isManualUnreadByUser),
      manualUnreadAt: readState?.manualUnreadAt,
      manualUnreadFromMessageId: readState?.manualUnreadFromMessageId,
      dmCounterpart,
      groupMemberPreview,
      groupMemberPreviewHasMore:
        roomRow.roomType === ChatRoomType.GROUP_DM
          ? otherMemberIds.length > (groupMemberPreview?.length || 0)
          : undefined,
      myPermissions: {
        ...permissions,
        canLeave:
          roomRow.myRole !== ChatMemberRole.OWNER ||
          (memberCountMap.get(roomRow.id) || 0) > 1,
      },
      viewerState: {
        membershipStatus: ChatRoomViewerMembershipStatus.MEMBER,
        isInvited: false,
        canViewPreview: true,
        canJoin: false,
      },
    };
  });

  const meta = PaginationHelper.buildMeta(total, query);
  const response = new PaginatedResponse(items, meta);
  await this.cacheService.set(
    listCacheKey,
    response,
    LIST_MY_ROOMS_CACHE_TTL_MS,
  );
  return response;
}
export async function discoverPublicRooms(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  query: DiscoverPublicRoomsQueryRequest,
): Promise<DiscoverPublicRoomsResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  const scopeFilter =
    await this.chatScopeAccessPolicyService.validateRoomScopeFilter(
      organizationId,
      userId,
      {
        contextScope: query.contextScope,
        contextId: query.contextId,
      },
    );
  const discoverCacheKey = buildDiscoverPublicRoomsCacheKey({
    organizationId,
    userId,
    query,
    scopeFilter,
  });
  const cachedDiscover =
    await this.cacheService.get<DiscoverPublicRoomsResponse>(discoverCacheKey);
  if (cachedDiscover) {
    return cachedDiscover;
  }

  const search = query.search?.trim();
  const limit = query.limit ?? 20;
  const sortBy = query.sortBy ?? DiscoverPublicRoomsSortBy.RECENT;
  const cursorDate = query.cursor ? new Date(query.cursor) : undefined;

  if (cursorDate && Number.isNaN(cursorDate.getTime())) {
    throw new BadRequestException('cursor must be a valid ISO datetime');
  }

  const qb = this.roomRepo
    .createQueryBuilder('r')
    .where('r.organization_id = :organizationId', { organizationId })
    .andWhere('r.room_type = :roomType', { roomType: ChatRoomType.CHANNEL })
    .andWhere('r.is_archived = false')
    .andWhere('r.visibility = :visibility', {
      visibility: ChatRoomVisibility.PUBLIC,
    });

  applyAccessibleRoomScopePredicate.call(this, {
    qb,
    roomAlias: 'r',
    organizationId,
    userId,
  });

  if (scopeFilter.contextScope) {
    qb.andWhere('r.context_scope = :filterContextScope', {
      filterContextScope: scopeFilter.contextScope,
    });
  }

  if (scopeFilter.contextId) {
    qb.andWhere('r.context_id = :filterContextId', {
      filterContextId: scopeFilter.contextId,
    });
  }

  if (search) {
    qb.andWhere(
      '(r.name ILIKE :search OR r.room_key ILIKE :search OR r.topic ILIKE :search OR r.description ILIKE :search)',
      { search: `%${search}%` },
    );
  }

  if (cursorDate) {
    qb.andWhere('r.updated_at < :cursor', {
      cursor: cursorDate.toISOString(),
    });
  }

  qb.select([
    'r.id AS "id"',
    'r.organization_id AS "organizationId"',
    'r.room_type AS "roomType"',
    'r.visibility AS "visibility"',
    'r.name AS "name"',
    'r.room_key AS "roomKey"',
    'r.topic AS "topic"',
    'r.description AS "description"',
    'r.last_message_at AS "lastMessageAt"',
    'r.is_archived AS "isArchived"',
    'r.updated_at AS "updatedAt"',
    'r.created_at AS "createdAt"',
  ]);

  applyDiscoverPublicRoomMemberCountStrategy.call(this, {
    qb,
    roomAlias: 'r',
    sortBy,
  });

  switch (sortBy) {
    case DiscoverPublicRoomsSortBy.MEMBERS:
      qb.orderBy(
        'COALESCE(room_member_counts.member_count, 0)',
        'DESC',
      ).addOrderBy('r.updated_at', 'DESC');
      break;
    case DiscoverPublicRoomsSortBy.NAME:
      qb.orderBy("LOWER(COALESCE(r.name, r.room_key, ''))", 'ASC').addOrderBy(
        'r.updated_at',
        'DESC',
      );
      break;
    case DiscoverPublicRoomsSortBy.RECENT:
    default:
      qb.orderBy('r.updated_at', 'DESC');
      break;
  }

  const rows = await qb.limit(limit + 1).getRawMany<{
    id: string;
    organizationId: string;
    roomType: ChatRoomType;
    visibility: ChatRoomVisibility;
    name?: string;
    roomKey?: string;
    topic?: string;
    description?: string;
    lastMessageAt?: Date;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
    memberCount?: string;
  }>();

  const hasNextPage = rows.length > limit;
  const selectedRows = hasNextPage ? rows.slice(0, limit) : rows;
  const roomIds = selectedRows.map((row) => row.id);

  const [activeMemberships, pendingInvitations] = await Promise.all([
    roomIds.length > 0
      ? this.roomMemberRepo.find({
          where: {
            organizationId,
            userId,
            isActive: true,
            roomId: In(roomIds),
          },
          select: ['roomId'],
        })
      : Promise.resolve([]),
    roomIds.length > 0
      ? this.invitationRepo.find({
          where: {
            organizationId,
            invitedUserId: userId,
            roomId: In(roomIds),
            status: ChatRoomInvitationStatus.PENDING,
          },
          select: ['roomId'],
        })
      : Promise.resolve([]),
  ]);

  const memberRoomIds = new Set(activeMemberships.map((item) => item.roomId));
  const invitedRoomIds = new Set(pendingInvitations.map((item) => item.roomId));

  const data = selectedRows.map((room) => {
    const isMember = memberRoomIds.has(room.id);
    const isInvited = !isMember && invitedRoomIds.has(room.id);
    const canJoin = !isMember && !room.isArchived;

    const viewerState: RoomViewerStateResponse = {
      membershipStatus: isMember
        ? ChatRoomViewerMembershipStatus.MEMBER
        : isInvited
          ? ChatRoomViewerMembershipStatus.INVITED
          : ChatRoomViewerMembershipStatus.NON_MEMBER,
      isInvited,
      canViewPreview: true,
      canJoin,
    };

    return {
      id: room.id,
      roomType: room.roomType,
      visibility: room.visibility,
      name: room.name,
      roomKey: room.roomKey,
      topic: room.topic,
      description: room.description,
      memberCount: Number(room.memberCount || 0),
      lastMessageAt: room.lastMessageAt,
      updatedAt: room.updatedAt,
      viewerState,
    };
  });

  const nextCursor =
    hasNextPage && selectedRows.length > 0
      ? selectedRows[selectedRows.length - 1].updatedAt.toISOString()
      : undefined;

  const response: DiscoverPublicRoomsResponse = {
    data,
    meta: {
      limit,
      nextCursor,
    },
  };
  await this.cacheService.set(
    discoverCacheKey,
    response,
    DISCOVER_PUBLIC_ROOMS_CACHE_TTL_MS,
  );
  return response;
}
export async function getRoomPreview(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
): Promise<RoomPreviewResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  const previewCacheKey = buildRoomPreviewCacheKey({
    organizationId,
    roomId,
    userId,
  });
  const cachedPreview =
    await this.cacheService.get<RoomPreviewResponse>(previewCacheKey);
  if (cachedPreview) {
    return cachedPreview;
  }

  const room = await this.roomRepo.findOne({
    where: { id: roomId, organizationId },
  });
  if (!room) {
    throw new NotFoundException('Chat room not found');
  }
  await this.chatScopeAccessPolicyService.assertRoomScopeAccess(room, userId);
  if (room.roomType !== ChatRoomType.CHANNEL) {
    throw new BadRequestException(
      'Room preview is only supported for channels',
    );
  }

  const [myMember, pendingInvitation, creatorUser, memberCount] =
    await Promise.all([
      this.roomMemberRepo.findOne({
        where: { organizationId, roomId, userId, isActive: true },
      }),
      this.invitationRepo.findOne({
        where: {
          organizationId,
          roomId,
          invitedUserId: userId,
          status: ChatRoomInvitationStatus.PENDING,
        },
      }),
      this.userRepo.findOne({
        where: { id: room.createdBy },
      }),
      this.roomMemberRepo.count({
        where: { organizationId, roomId, isActive: true },
      }),
    ]);

  const isMember = Boolean(myMember);
  const isInvited = !isMember && Boolean(pendingInvitation);
  const canViewPreview =
    isMember || isInvited || room.visibility === ChatRoomVisibility.PUBLIC;
  if (!canViewPreview) {
    throw new ForbiddenException(
      'You do not have permission to preview this room',
    );
  }

  const canJoin =
    room.visibility === ChatRoomVisibility.PUBLIC &&
    !isMember &&
    !room.isArchived;

  const viewerState: RoomViewerStateResponse = {
    membershipStatus: isMember
      ? ChatRoomViewerMembershipStatus.MEMBER
      : isInvited
        ? ChatRoomViewerMembershipStatus.INVITED
        : ChatRoomViewerMembershipStatus.NON_MEMBER,
    isInvited,
    canViewPreview: true,
    canJoin,
  };

  const response: RoomPreviewResponse = {
    id: room.id,
    organizationId: room.organizationId,
    roomType: room.roomType,
    visibility: room.visibility,
    name: room.name,
    roomKey: room.roomKey,
    topic: room.topic,
    description: room.description,
    memberCount,
    createdByDisplayName: this.buildUserDisplayName({
      userId: room.createdBy,
      email: creatorUser?.email,
      firstName: creatorUser?.firstName,
      lastName: creatorUser?.lastName,
    }),
    isArchived: room.isArchived,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    viewerState,
  };
  await this.cacheService.set(
    previewCacheKey,
    response,
    ROOM_PREVIEW_CACHE_TTL_MS,
  );
  return response;
}
export async function listCreateRoomCandidates(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  query: GetCreateRoomCandidatesQueryRequest,
): Promise<CreateRoomCandidatesResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const roomType = query.roomType ?? ChatRoomType.GROUP_DM;
  if (roomType !== ChatRoomType.GROUP_DM) {
    throw new BadRequestException(
      'create-candidates currently supports only roomType=group_dm',
    );
  }

  const scopeFilter =
    await this.chatScopeAccessPolicyService.validateRoomScopeFilter(
      organizationId,
      userId,
      {
        contextScope: query.contextScope,
        contextId: query.contextId,
      },
    );
  const contextScope =
    scopeFilter.contextScope ?? ChatContextScope.ORGANIZATION;
  const contextId = scopeFilter.contextId;

  if (contextScope === ChatContextScope.PROJECT && !contextId) {
    throw new BadRequestException(
      'contextId is required when contextScope=project for create-candidates',
    );
  }

  const search = query.search?.trim();
  const limit = query.limit ?? 20;
  const candidateQb = this.organizationMemberRepo
    .createQueryBuilder('om')
    .innerJoin(User, 'u', 'u.id = om.user_id AND u.deleted_at IS NULL')
    .where('om.organization_id = :organizationId', { organizationId })
    .andWhere('om.is_active = true')
    .andWhere('om.is_deleted = false')
    .andWhere('om.user_id <> :userId', { userId })
    .andWhere(
      search
        ? "(u.email ILIKE :search OR u.first_name ILIKE :search OR u.last_name ILIKE :search OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) ILIKE :search)"
        : '1=1',
      search ? { search: `%${search}%` } : {},
    )
    .select([
      'u.id AS "userId"',
      'u.email AS "email"',
      'u.first_name AS "firstName"',
      'u.last_name AS "lastName"',
      'u.avatar_url AS "avatarUrl"',
    ]);

  let projectEligibilityExpression: string | undefined;
  if (contextScope === ChatContextScope.PROJECT && contextId) {
    candidateQb
      .innerJoin(
        Project,
        'candidate_project',
        [
          'candidate_project.id = :contextId',
          'candidate_project.organization_id = :organizationId',
          'candidate_project.deleted_at IS NULL',
        ].join(' AND '),
        { contextId, organizationId },
      )
      .leftJoin(
        ProjectMember,
        'candidate_project_member',
        [
          'candidate_project_member.project_id = candidate_project.id',
          'candidate_project_member.organization_id = :organizationId',
          'candidate_project_member.user_id = om.user_id',
          'candidate_project_member.is_active = true',
          'candidate_project_member.deleted_at IS NULL',
        ].join(' AND '),
        { organizationId },
      );

    projectEligibilityExpression = [
      'CASE',
      'WHEN om.user_id = candidate_project.created_by THEN true',
      'WHEN om.user_id = ANY(COALESCE(candidate_project.manager_id, ARRAY[]::uuid[])) THEN true',
      'WHEN candidate_project_member.id IS NOT NULL THEN true',
      'ELSE false',
      'END',
    ].join(' ');
    candidateQb.addSelect(projectEligibilityExpression, 'isEligible');
  }

  if (projectEligibilityExpression) {
    candidateQb
      .orderBy(projectEligibilityExpression, 'DESC')
      .addOrderBy("LOWER(COALESCE(u.first_name, u.email, ''))", 'ASC');
  } else {
    candidateQb.orderBy("LOWER(COALESCE(u.first_name, u.email, ''))", 'ASC');
  }

  const candidateRows = await candidateQb
    .addOrderBy('u.id', 'ASC')
    .limit(limit)
    .getRawMany<{
      userId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      isEligible?: boolean | string | number;
    }>();

  if (candidateRows.length === 0) {
    return {
      roomType,
      contextScope,
      contextId,
      items: [],
    };
  }

  const toBoolean = (value: unknown): boolean =>
    value === true ||
    value === 'true' ||
    value === 't' ||
    value === 1 ||
    value === '1';

  const items: CreateRoomCandidateItemResponse[] = candidateRows.map((row) => {
    const isEligible =
      contextScope === ChatContextScope.PROJECT
        ? toBoolean(row.isEligible)
        : true;
    const reasonBlocked =
      contextScope === ChatContextScope.PROJECT && !isEligible
        ? 'not_in_project'
        : undefined;

    return {
      userId: row.userId,
      displayName: this.buildUserDisplayName({
        userId: row.userId,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
      }),
      email: row.email,
      avatarUrl: row.avatarUrl,
      isEligible,
      reasonBlocked,
    };
  });

  return {
    roomType,
    contextScope,
    contextId,
    items,
  };
}
export async function listInviteCandidates(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  query: GetInviteCandidatesQueryRequest,
): Promise<RoomInviteCandidatesResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );

  if (!access.permissions.canInviteMembers) {
    throw new ForbiddenException(
      'You do not have permission to invite members in this room',
    );
  }
  if (access.room.isArchived) {
    throw new BadRequestException(
      'Cannot list invite candidates for archived room',
    );
  }

  const search = query.search?.trim();
  const limit = query.limit ?? 20;

  const candidateRows = await this.organizationMemberRepo
    .createQueryBuilder('om')
    .innerJoin(User, 'u', 'u.id = om.user_id AND u.deleted_at IS NULL')
    .where('om.organization_id = :organizationId', { organizationId })
    .andWhere('om.is_active = true')
    .andWhere('om.is_deleted = false')
    .andWhere('om.user_id <> :userId', { userId })
    .andWhere(
      search
        ? "(u.email ILIKE :search OR u.first_name ILIKE :search OR u.last_name ILIKE :search OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) ILIKE :search)"
        : '1=1',
      search ? { search: `%${search}%` } : {},
    )
    .select([
      'u.id AS "userId"',
      'u.email AS "email"',
      'u.first_name AS "firstName"',
      'u.last_name AS "lastName"',
      'u.avatar_url AS "avatarUrl"',
    ])
    .orderBy("LOWER(COALESCE(u.first_name, u.email, ''))", 'ASC')
    .addOrderBy('u.id', 'ASC')
    .limit(limit)
    .getRawMany<{
      userId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    }>();

  if (candidateRows.length === 0) {
    return {
      roomId,
      items: [],
    };
  }

  const candidateUserIds = candidateRows.map((item) => item.userId);
  const [activeMembers, pendingInvitations] = await Promise.all([
    this.roomMemberRepo.find({
      where: {
        organizationId,
        roomId,
        userId: In(candidateUserIds),
        isActive: true,
      },
      select: ['userId'],
    }),
    this.invitationRepo.find({
      where: {
        organizationId,
        roomId,
        invitedUserId: In(candidateUserIds),
        status: ChatRoomInvitationStatus.PENDING,
      },
      select: ['invitedUserId'],
    }),
  ]);

  const memberUserIds = new Set(activeMembers.map((member) => member.userId));
  const invitedUserIds = new Set(
    pendingInvitations.map((invitation) => invitation.invitedUserId),
  );

  const items: RoomInviteCandidateItemResponse[] = candidateRows.map((row) => {
    const isAlreadyMember = memberUserIds.has(row.userId);
    const hasPendingInvitation = invitedUserIds.has(row.userId);
    let reasonBlocked: string | undefined;
    if (isAlreadyMember) {
      reasonBlocked = 'already_member';
    } else if (hasPendingInvitation) {
      reasonBlocked = 'pending_invitation';
    }

    return {
      userId: row.userId,
      displayName: this.buildUserDisplayName({
        userId: row.userId,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
      }),
      email: row.email,
      avatarUrl: row.avatarUrl,
      isAlreadyMember,
      hasPendingInvitation,
      reasonBlocked,
    };
  });

  return {
    roomId,
    items,
  };
}
export async function getRoomDetail(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  options?: {
    includeMembers?: boolean;
  },
): Promise<RoomDetailResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  const room = access.room;
  const myMember = access.member;
  const includeMembers = options?.includeMembers ?? true;

  const activeMembers = includeMembers
    ? await this.roomMemberRepo.find({
        where: { organizationId, roomId, isActive: true },
        order: { joinedAt: 'ASC' },
      })
    : [];

  const memberCount = includeMembers
    ? activeMembers.length
    : (await this.getActiveMemberCountMap([roomId])).get(roomId) || 0;

  const relatedUserIds = Array.from(
    new Set(
      [
        room.createdBy,
        room.archivedByUserId,
        ...activeMembers.map((member) => member.userId),
      ].filter((item): item is string => Boolean(item)),
    ),
  );
  const users =
    relatedUserIds.length > 0
      ? await this.userRepo.findBy({
          id: In(relatedUserIds),
        })
      : [];
  const userMap = new Map(users.map((user) => [user.id, user]));
  const creatorUser = userMap.get(room.createdBy);
  const archivedByUser = room.archivedByUserId
    ? userMap.get(room.archivedByUserId)
    : undefined;

  const myPermissions = this.buildRoomPermissions(
    myMember.memberRole,
    room.visibility,
    room.roomType,
    room.roomKey,
    room.contextScope,
    room.allowMemberPinMessages,
    room.allowGuestPinMessages,
  );
  myPermissions.canLeave =
    myMember.memberRole !== ChatMemberRole.OWNER || memberCount > 1;

  const readState = await this.readStateRepo.findOne({
    where: {
      organizationId,
      roomId,
      userId,
    },
    select: [
      'isManualUnreadByUser',
      'manualUnreadAt',
      'manualUnreadFromMessageId',
    ],
  });

  return {
    ...this.toRoomSummary(
      room,
      myMember.memberRole,
      memberCount,
      myPermissions,
      myMember.notifyLevel,
      myMember.isHidden,
      myMember.hiddenReason,
      myMember.hiddenAt,
      myMember.isStarred,
      myMember.starredAt,
      this.buildUserDisplayName({
        userId: room.createdBy,
        email: creatorUser?.email,
        firstName: creatorUser?.firstName,
        lastName: creatorUser?.lastName,
      }),
      room.archivedByUserId
        ? this.buildUserDisplayName({
            userId: room.archivedByUserId,
            email: archivedByUser?.email,
            firstName: archivedByUser?.firstName,
            lastName: archivedByUser?.lastName,
          })
        : undefined,
      {
        membershipStatus: ChatRoomViewerMembershipStatus.MEMBER,
        isInvited: false,
        canViewPreview: true,
        canJoin: false,
      },
      Boolean(readState?.isManualUnreadByUser),
      readState?.manualUnreadAt,
      readState?.manualUnreadFromMessageId,
    ),
    members: includeMembers
      ? activeMembers.map((member) =>
          this.toRoomMemberResponse(member, userMap.get(member.userId)),
        )
      : [],
  };
}
export async function getRoomBootstrap(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  query: GetRoomBootstrapQueryRequest,
): Promise<RoomBootstrapResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const includeMembers = query.includeMembers ?? false;
  const messageLimit = query.messageLimit || 30;
  const pinnedLimit = query.pinnedLimit || 5;
  const roomStateVersion = await this.getCacheVersionNumber(
    buildUserRoomStateCacheVersionKey({
      organizationId,
      roomId,
      userId,
    }),
  );
  const bootstrapCacheKey = buildRoomBootstrapCacheKey({
    organizationId,
    roomId,
    userId,
    stateVersion: roomStateVersion,
    query: {
      includeMembers,
      messageLimit,
      pinnedLimit,
    },
  });
  const cachedBootstrap =
    await this.cacheService.get<RoomBootstrapResponse>(bootstrapCacheKey);
  if (cachedBootstrap) {
    return cachedBootstrap;
  }

  const [room, tabs, messages, draft, pinnedMessages, readState] =
    await Promise.all([
      this.getRoomDetail(organizationId, roomId, userId, { includeMembers }),
      this.getRoomTabs(organizationId, roomId, userId),
      this.listRoomMessagesByCursor(organizationId, roomId, userId, {
        limit: messageLimit,
      }),
      this.getCurrentDraft(organizationId, roomId, userId, {}),
      this.listPinnedMessages(organizationId, roomId, userId, {
        limit: pinnedLimit,
      }),
      this.readStateRepo.findOne({
        where: {
          organizationId,
          roomId,
          userId,
        },
        select: [
          'lastReadAt',
          'lastReadMessageId',
          'isManualUnreadByUser',
          'manualUnreadAt',
          'manualUnreadFromMessageId',
        ],
      }),
    ]);

  const unreadCount = await this.getUnreadCountForRoom({
    organizationId,
    roomId,
    userId,
    lastReadAt: readState?.lastReadAt,
  });

  const response: RoomBootstrapResponse = {
    room,
    tabs,
    messages,
    draft,
    pinnedMessages,
    readState: {
      roomId,
      userId,
      lastReadMessageId: readState?.lastReadMessageId,
      lastReadAt: readState?.lastReadAt,
      unreadCount,
      isManualUnreadByUser: Boolean(readState?.isManualUnreadByUser),
      manualUnreadAt: readState?.manualUnreadAt,
      manualUnreadFromMessageId: readState?.manualUnreadFromMessageId,
    },
  };
  await this.cacheService.set(
    bootstrapCacheKey,
    response,
    ROOM_BOOTSTRAP_CACHE_TTL_MS,
  );
  return response;
}
export async function updateRoomInfo(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  callerId: string,
  dto: UpdateRoomInfoRequest,
): Promise<UpdateRoomInfoResponse> {
  await this.assertActiveOrgMember(organizationId, callerId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    callerId,
  );

  if (access.room.roomType === ChatRoomType.DM) {
    throw new BadRequestException(
      'DM room info is fixed and cannot be modified',
    );
  }

  if (
    access.member.memberRole !== ChatMemberRole.OWNER &&
    access.member.memberRole !== ChatMemberRole.ADMIN
  ) {
    throw new ForbiddenException('Only owner/admin can update room info');
  }

  if (
    dto.name === undefined &&
    dto.topic === undefined &&
    dto.description === undefined
  ) {
    throw new BadRequestException(
      'At least one field is required: name, topic or description',
    );
  }

  const previousName = access.room.name;
  const previousTopic = access.room.topic;
  const previousDescription = access.room.description;

  const nextName = dto.name !== undefined ? dto.name.trim() : previousName;
  const nextTopic = dto.topic !== undefined ? dto.topic.trim() : previousTopic;
  const nextDescription =
    dto.description !== undefined
      ? dto.description.trim()
      : previousDescription;

  if (
    dto.name !== undefined &&
    !nextName &&
    access.room.roomType === ChatRoomType.CHANNEL
  ) {
    throw new BadRequestException('Channel name cannot be empty');
  }

  const updated =
    (previousName || undefined) !== (nextName || undefined) ||
    (previousTopic || undefined) !== (nextTopic || undefined) ||
    (previousDescription || undefined) !== (nextDescription || undefined);

  if (updated) {
    access.room.name = nextName || undefined;
    access.room.topic = nextTopic || undefined;
    access.room.description = nextDescription || undefined;
    await this.roomRepo.save(access.room);
    await this.emitRoomUpdatedEvent({
      organizationId,
      roomId,
      updatedByUserId: callerId,
      changeType: 'room_info',
      room: access.room,
    });
  }

  const roomDetail = await this.getRoomDetail(
    organizationId,
    roomId,
    callerId,
    { includeMembers: false },
  );

  return {
    roomId: access.room.id,
    previousName,
    currentName: access.room.name,
    previousTopic,
    currentTopic: access.room.topic,
    previousDescription,
    currentDescription: access.room.description,
    updated,
    room: roomDetail,
  };
}
export async function updateRoomVisibility(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  callerId: string,
  dto: UpdateRoomVisibilityRequest,
): Promise<UpdateRoomVisibilityResponse> {
  await this.assertActiveOrgMember(organizationId, callerId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    callerId,
  );

  if (access.room.roomType !== ChatRoomType.CHANNEL) {
    throw new BadRequestException(
      'Only channel room visibility can be updated',
    );
  }
  if (!access.permissions.canManageMembers) {
    throw new ForbiddenException(
      'Only owner/admin can change this channel visibility',
    );
  }
  if (access.room.isArchived) {
    throw new UnprocessableEntityException(
      'Archived room cannot change visibility',
    );
  }

  if (dto.expectedUpdatedAt) {
    const expectedUpdatedAt = new Date(dto.expectedUpdatedAt);
    if (Number.isNaN(expectedUpdatedAt.getTime())) {
      throw new BadRequestException(
        'expectedUpdatedAt must be a valid ISO datetime',
      );
    }
    if (
      access.room.updatedAt &&
      access.room.updatedAt.toISOString() !== expectedUpdatedAt.toISOString()
    ) {
      throw new ConflictException(
        'Room was updated by another request. Please refresh and retry.',
      );
    }
  }

  const previousVisibility = access.room.visibility;
  const currentVisibility = dto.visibility;
  const updated = previousVisibility !== currentVisibility;

  if (updated) {
    access.room.visibility = currentVisibility;
    await this.roomRepo.save(access.room);

    const actor = await this.userRepo.findOne({
      where: { id: callerId },
      select: ['id', 'email', 'firstName', 'lastName'],
    });
    const changedAt = new Date().toISOString();
    const changedByDisplayName = this.buildUserDisplayName({
      userId: callerId,
      email: actor?.email,
      firstName: actor?.firstName,
      lastName: actor?.lastName,
    });

    const visibilityEvent: ChatRoomVisibilityChangedDomainEvent = {
      organizationId,
      roomId,
      visibility: currentVisibility,
      changedByUserId: callerId,
      changedByDisplayName,
      changedAt,
    };
    this.eventEmitter.emit(
      CHAT_BOX_EVENTS.ROOM_VISIBILITY_CHANGED,
      visibilityEvent,
    );

    await this.emitRoomVisibilitySystemMessage({
      organizationId,
      roomId,
      actorUserId: callerId,
      visibility: currentVisibility,
    });
    await this.emitRoomUpdatedEvent({
      organizationId,
      roomId,
      updatedByUserId: callerId,
      changeType: 'room_visibility',
      room: access.room,
    });
  }

  return {
    roomId: access.room.id,
    actorUserId: callerId,
    previousVisibility,
    currentVisibility,
    updated,
    updatedAt: access.room.updatedAt,
    room: {
      id: access.room.id,
      visibility: access.room.visibility,
      updatedAt: access.room.updatedAt,
    },
  };
}
export async function archiveRoom(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
): Promise<UpdateRoomArchiveResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );

  if (!access.permissions.canManageMembers) {
    throw new ForbiddenException('Only owner/admin can archive this room');
  }
  if (access.room.roomType === ChatRoomType.DM) {
    throw new BadRequestException('DM room cannot be archived');
  }

  const previousIsArchived = access.room.isArchived;
  if (previousIsArchived) {
    return {
      roomId,
      actorUserId: userId,
      previousIsArchived,
      currentIsArchived: true,
      archivedAt: access.room.archivedAt,
      archivedByUserId: access.room.archivedByUserId,
      archivedByDisplayName: await this.resolveArchivedByDisplayName(
        access.room.archivedByUserId,
      ),
      updated: false,
      room: await this.getRoomDetail(organizationId, roomId, userId, {
        includeMembers: false,
      }),
    };
  }

  access.room.isArchived = true;
  access.room.archivedAt = new Date();
  access.room.archivedByUserId = userId;
  await this.roomRepo.save(access.room);
  await this.emitRoomUpdatedEvent({
    organizationId,
    roomId,
    updatedByUserId: userId,
    changeType: 'room_archived',
    room: access.room,
  });

  return {
    roomId,
    actorUserId: userId,
    previousIsArchived,
    currentIsArchived: true,
    archivedAt: access.room.archivedAt,
    archivedByUserId: access.room.archivedByUserId,
    archivedByDisplayName: await this.resolveArchivedByDisplayName(userId),
    updated: true,
    room: await this.getRoomDetail(organizationId, roomId, userId, {
      includeMembers: false,
    }),
  };
}
export async function unarchiveRoom(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
): Promise<UpdateRoomArchiveResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );

  if (!access.permissions.canManageMembers) {
    throw new ForbiddenException('Only owner/admin can unarchive this room');
  }
  if (access.room.roomType === ChatRoomType.DM) {
    throw new BadRequestException('DM room cannot be archived/unarchived');
  }

  const previousIsArchived = access.room.isArchived;
  if (!previousIsArchived) {
    return {
      roomId,
      actorUserId: userId,
      previousIsArchived,
      currentIsArchived: false,
      updated: false,
      room: await this.getRoomDetail(organizationId, roomId, userId, {
        includeMembers: false,
      }),
    };
  }

  access.room.isArchived = false;
  access.room.archivedAt = undefined;
  access.room.archivedByUserId = undefined;
  await this.roomRepo.save(access.room);
  await this.emitRoomUpdatedEvent({
    organizationId,
    roomId,
    updatedByUserId: userId,
    changeType: 'room_unarchived',
    room: access.room,
  });

  return {
    roomId,
    actorUserId: userId,
    previousIsArchived,
    currentIsArchived: false,
    updated: true,
    room: await this.getRoomDetail(organizationId, roomId, userId, {
      includeMembers: false,
    }),
  };
}
export async function getRoomTabs(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
): Promise<RoomTabsResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const config = await this.roomTabConfigRepo.findOne({
    where: { organizationId, roomId },
  });
  const tabs = this.normalizeRoomTabs(config?.tabs);

  return {
    roomId,
    scope: 'room',
    tabs,
    updated: false,
    updatedAt: config?.updatedAt ?? new Date(),
  };
}
export async function updateRoomTabs(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  dto: UpdateRoomTabsRequest,
): Promise<RoomTabsResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );

  if (
    access.room.roomType !== ChatRoomType.DM &&
    !access.permissions.canManageMembers
  ) {
    throw new ForbiddenException('Only owner/admin can update room tabs');
  }

  const normalizedTabs = this.normalizeRoomTabs(dto.tabs);
  this.validateRoomTabs(normalizedTabs);

  let config = await this.roomTabConfigRepo.findOne({
    where: { organizationId, roomId },
  });

  if (!config) {
    config = this.roomTabConfigRepo.create({
      organizationId,
      roomId,
      tabs: normalizedTabs,
      updatedBy: userId,
    });
    const saved = await this.roomTabConfigRepo.save(config);
    return {
      roomId,
      scope: 'room',
      tabs: this.normalizeRoomTabs(saved.tabs),
      updated: true,
      updatedAt: saved.updatedAt,
    };
  }

  const previousNormalized = this.normalizeRoomTabs(config.tabs);
  const updated =
    JSON.stringify(previousNormalized) !== JSON.stringify(normalizedTabs);
  if (updated) {
    config.tabs = normalizedTabs;
    config.updatedBy = userId;
    config = await this.roomTabConfigRepo.save(config);
  }

  return {
    roomId,
    scope: 'room',
    tabs: this.normalizeRoomTabs(config.tabs),
    updated,
    updatedAt: config.updatedAt,
  };
}
export async function starRoom(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
): Promise<UpdateRoomStarResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );

  if (access.member.isStarred) {
    return {
      roomId,
      userId,
      isStarred: true,
      starredAt: access.member.starredAt,
      updated: false,
    };
  }

  access.member.isStarred = true;
  access.member.starredAt = new Date();
  await this.roomMemberRepo.save(access.member);

  return {
    roomId,
    userId,
    isStarred: true,
    starredAt: access.member.starredAt,
    updated: true,
  };
}
export async function unstarRoom(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
): Promise<UpdateRoomStarResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );

  if (!access.member.isStarred) {
    return {
      roomId,
      userId,
      isStarred: false,
      starredAt: undefined,
      updated: false,
    };
  }

  access.member.isStarred = false;
  access.member.starredAt = undefined;
  await this.roomMemberRepo.save(access.member);

  return {
    roomId,
    userId,
    isStarred: false,
    starredAt: undefined,
    updated: true,
  };
}
export async function updateRoomPolicies(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  callerId: string,
  dto: UpdateRoomPoliciesRequest,
): Promise<UpdateRoomPoliciesResponse> {
  await this.assertActiveOrgMember(organizationId, callerId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    callerId,
  );
  if (access.room.roomType === ChatRoomType.DM) {
    throw new BadRequestException(
      'DM room policies are fixed and cannot be modified',
    );
  }
  if (
    access.member.memberRole !== ChatMemberRole.OWNER &&
    access.member.memberRole !== ChatMemberRole.ADMIN
  ) {
    throw new ForbiddenException('Only owner/admin can update room policies');
  }

  const previousAllowMemberPinMessages = access.room.allowMemberPinMessages;
  const previousAllowGuestPinMessages = access.room.allowGuestPinMessages;

  const nextAllowMemberPinMessages =
    dto.allowMemberPinMessages ?? previousAllowMemberPinMessages;
  const nextAllowGuestPinMessages =
    dto.allowGuestPinMessages ?? previousAllowGuestPinMessages;

  const updated =
    nextAllowMemberPinMessages !== previousAllowMemberPinMessages ||
    nextAllowGuestPinMessages !== previousAllowGuestPinMessages;

  if (updated) {
    access.room.allowMemberPinMessages = nextAllowMemberPinMessages;
    access.room.allowGuestPinMessages = nextAllowGuestPinMessages;
    await this.roomRepo.save(access.room);
    await this.emitRoomUpdatedEvent({
      organizationId,
      roomId,
      updatedByUserId: callerId,
      changeType: 'room_policies',
      room: access.room,
    });
  }

  const roomDetail = await this.getRoomDetail(
    organizationId,
    roomId,
    callerId,
    { includeMembers: false },
  );

  return {
    roomId: access.room.id,
    previousAllowMemberPinMessages,
    currentAllowMemberPinMessages: nextAllowMemberPinMessages,
    previousAllowGuestPinMessages,
    currentAllowGuestPinMessages: nextAllowGuestPinMessages,
    updated,
    room: roomDetail,
  };
}
export async function joinPublicRoom(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
): Promise<JoinRoomResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const room = await this.roomRepo.findOne({
    where: { id: roomId, organizationId },
  });
  if (!room) {
    throw new NotFoundException('Chat room not found');
  }
  await this.chatScopeAccessPolicyService.assertRoomScopeAccess(room, userId);
  if (room.isArchived) {
    throw new BadRequestException('Cannot join an archived room');
  }
  if (
    room.roomType !== ChatRoomType.CHANNEL ||
    room.visibility !== ChatRoomVisibility.PUBLIC
  ) {
    throw new ForbiddenException('Only public channels can be joined directly');
  }

  const existingMember = await this.roomMemberRepo.findOne({
    where: { organizationId, roomId, userId },
  });

  if (existingMember) {
    if (!existingMember.isActive) {
      existingMember.isActive = true;
      existingMember.leftAt = undefined;
      existingMember.joinSource = ChatJoinSource.MANUAL;
      existingMember.memberRole = ChatMemberRole.MEMBER;
      await this.roomMemberRepo.save(existingMember);
      await this.bumpRoomMemberRoomsStateVersions({
        organizationId,
        roomId,
      });
      const joinEvent: ChatRoomMemberJoinedDomainEvent = {
        organizationId,
        roomId,
        userId,
        joinSource: ChatJoinSource.MANUAL,
        occurredAt: new Date().toISOString(),
      };
      this.eventEmitter.emit(CHAT_BOX_EVENTS.ROOM_MEMBER_JOINED, joinEvent);
      await this.emitRoomMemberSystemMessage({
        organizationId,
        roomId,
        actorUserId: userId,
        memberUserId: userId,
        action: 'joined',
        joinSource: ChatJoinSource.MANUAL,
      });
      return {
        joined: true,
        room: await this.getRoomDetail(organizationId, roomId, userId, {
          includeMembers: false,
        }),
      };
    }
    return {
      joined: false,
      room: await this.getRoomDetail(organizationId, roomId, userId, {
        includeMembers: false,
      }),
    };
  }

  await this.roomMemberRepo.save(
    this.roomMemberRepo.create({
      organizationId,
      roomId,
      userId,
      memberRole: ChatMemberRole.MEMBER,
      joinSource: ChatJoinSource.MANUAL,
      isActive: true,
    }),
  );

  await this.bumpRoomMemberRoomsStateVersions({
    organizationId,
    roomId,
  });
  const joinEvent: ChatRoomMemberJoinedDomainEvent = {
    organizationId,
    roomId,
    userId,
    joinSource: ChatJoinSource.MANUAL,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.ROOM_MEMBER_JOINED, joinEvent);
  await this.emitRoomMemberSystemMessage({
    organizationId,
    roomId,
    actorUserId: userId,
    memberUserId: userId,
    action: 'joined',
    joinSource: ChatJoinSource.MANUAL,
  });

  return {
    joined: true,
    room: await this.getRoomDetail(organizationId, roomId, userId, {
      includeMembers: false,
    }),
  };
}
export async function inviteMembers(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  inviterId: string,
  dto: InviteRoomMembersRequest,
): Promise<RoomInvitationResponse[]> {
  await this.assertActiveOrgMember(organizationId, inviterId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    inviterId,
  );
  if (!access.permissions.canInviteMembers) {
    throw new ForbiddenException(
      'You do not have permission to invite members in this room',
    );
  }
  if (access.room.isArchived) {
    throw new BadRequestException('Cannot invite members to an archived room');
  }

  if (dto.memberRole === ChatMemberRole.OWNER) {
    throw new BadRequestException('Invitation cannot assign owner role');
  }
  const invitedMemberRole = this.resolveInvitationMemberRole(dto.memberRole);

  const uniqueUserIds = Array.from(new Set(dto.userIds || [])).filter(
    (id) => id !== inviterId,
  );
  if (uniqueUserIds.length === 0) {
    return [];
  }

  await this.ensureUsersAreActiveOrgMembers(organizationId, uniqueUserIds);
  await this.chatScopeAccessPolicyService.assertUsersCanJoinRoomScope(
    access.room,
    uniqueUserIds,
  );

  const [existingActiveMembers, users] = await Promise.all([
    this.roomMemberRepo.find({
      where: {
        organizationId,
        roomId,
        userId: In(uniqueUserIds),
        isActive: true,
      },
    }),
    this.userRepo.findBy({ id: In(uniqueUserIds) }),
  ]);

  const alreadyInRoom = new Set(
    existingActiveMembers.map((member) => member.userId),
  );
  const userMap = new Map(users.map((user) => [user.id, user]));
  const invitations: ChatRoomInvitation[] = [];

  for (const targetUserId of uniqueUserIds) {
    if (alreadyInRoom.has(targetUserId)) {
      continue;
    }

    const existingPending = await this.invitationRepo.findOne({
      where: {
        organizationId,
        roomId,
        invitedUserId: targetUserId,
        status: ChatRoomInvitationStatus.PENDING,
      },
    });
    if (existingPending) {
      existingPending.memberRole = invitedMemberRole;
      if (dto.inviteMessage !== undefined) {
        existingPending.inviteMessage = dto.inviteMessage?.trim();
      }
      invitations.push(existingPending);
      continue;
    }

    invitations.push(
      this.invitationRepo.create({
        organizationId,
        roomId,
        invitedUserId: targetUserId,
        invitedBy: inviterId,
        email: userMap.get(targetUserId)?.email,
        inviteMessage: dto.inviteMessage?.trim(),
        memberRole: invitedMemberRole,
        status: ChatRoomInvitationStatus.PENDING,
      }),
    );
  }

  if (invitations.length === 0) {
    return [];
  }

  const saved = await this.invitationRepo.save(invitations);
  const response = saved.map((invitation) =>
    this.toRoomInvitationResponse(invitation),
  );

  const event: ChatRoomInvitationsCreatedDomainEvent = {
    organizationId,
    roomId,
    inviterUserId: inviterId,
    invitations: response,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.ROOM_INVITATIONS_CREATED, event);

  return response;
}
export async function acceptInvitation(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  invitationId: string,
  userId: string,
): Promise<AcceptInvitationResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const invitation = await this.invitationRepo.findOne({
    where: { id: invitationId, organizationId },
  });
  if (!invitation) {
    throw new NotFoundException('Invitation not found');
  }
  if (invitation.invitedUserId !== userId) {
    throw new ForbiddenException('You cannot accept this invitation');
  }
  if (invitation.status === ChatRoomInvitationStatus.ACCEPTED) {
    await this.syncAcceptedInvitationNotification({
      organizationId,
      invitation,
      acceptedAt: invitation.acceptedAt ?? new Date(),
    });
    return {
      invitationId: invitation.id,
      roomId: invitation.roomId,
      invitationStatus: ChatRoomInvitationStatus.ACCEPTED,
      acceptedAt: invitation.acceptedAt,
      alreadyAccepted: true,
      room: await this.getRoomDetailIfAccessible(
        organizationId,
        invitation.roomId,
        userId,
      ),
    };
  }
  if (invitation.status !== ChatRoomInvitationStatus.PENDING) {
    throw new BadRequestException('Invitation is no longer pending');
  }

  const room = await this.roomRepo.findOne({
    where: { id: invitation.roomId, organizationId },
  });
  if (!room) {
    throw new NotFoundException('Chat room not found');
  }
  await this.chatScopeAccessPolicyService.assertRoomScopeAccess(room, userId);
  if (room.isArchived) {
    throw new BadRequestException('Cannot accept invitation for archived room');
  }
  const invitedMemberRole = this.resolveInvitationMemberRole(
    invitation.memberRole,
  );
  const acceptedAt = new Date();

  await this.dataSource.transaction(async (manager) => {
    const existingMember = await manager.findOne(ChatRoomMember, {
      where: {
        organizationId,
        roomId: invitation.roomId,
        userId,
      },
    });

    if (existingMember) {
      existingMember.isActive = true;
      existingMember.leftAt = undefined;
      existingMember.joinSource = ChatJoinSource.INVITE;
      existingMember.memberRole = invitedMemberRole;
      await manager.save(existingMember);
    } else {
      await manager.save(
        manager.create(ChatRoomMember, {
          organizationId,
          roomId: invitation.roomId,
          userId,
          memberRole: invitedMemberRole,
          joinSource: ChatJoinSource.INVITE,
          isActive: true,
        }),
      );
    }

    invitation.status = ChatRoomInvitationStatus.ACCEPTED;
    invitation.acceptedAt = acceptedAt;
    await manager.save(invitation);
  });

  await this.bumpRoomMemberRoomsStateVersions({
    organizationId,
    roomId: invitation.roomId,
  });
  const joinEvent: ChatRoomMemberJoinedDomainEvent = {
    organizationId,
    roomId: invitation.roomId,
    userId,
    joinSource: ChatJoinSource.INVITE,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.ROOM_MEMBER_JOINED, joinEvent);
  await this.emitRoomMemberSystemMessage({
    organizationId,
    roomId: invitation.roomId,
    actorUserId: userId,
    memberUserId: userId,
    action: 'joined',
    joinSource: ChatJoinSource.INVITE,
  });

  const roomDetail = await this.getRoomDetail(
    organizationId,
    invitation.roomId,
    userId,
    { includeMembers: false },
  );
  await this.syncAcceptedInvitationNotification({
    organizationId,
    invitation,
    room,
    acceptedAt,
  });
  return {
    invitationId: invitation.id,
    roomId: invitation.roomId,
    invitationStatus: ChatRoomInvitationStatus.ACCEPTED,
    acceptedAt,
    alreadyAccepted: false,
    room: roomDetail,
  };
}
export async function updateMemberRole(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  targetUserId: string,
  callerId: string,
  dto: UpdateRoomMemberRoleRequest,
): Promise<UpdateRoomMemberRoleResponse> {
  await this.assertActiveOrgMember(organizationId, callerId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    callerId,
  );
  if (!access.permissions.canManageMembers) {
    throw new ForbiddenException(
      'You do not have permission to manage members',
    );
  }

  if (dto.memberRole === ChatMemberRole.OWNER) {
    throw new BadRequestException('Use owner transfer flow to change owner');
  }

  const targetMember = await this.roomMemberRepo.findOne({
    where: {
      organizationId,
      roomId,
      userId: targetUserId,
      isActive: true,
    },
  });
  if (!targetMember) {
    throw new NotFoundException('Target member not found in room');
  }

  if (targetMember.memberRole === ChatMemberRole.OWNER) {
    throw new ForbiddenException('Cannot edit owner role');
  }
  if (
    targetMember.userId === callerId &&
    access.member.memberRole === ChatMemberRole.OWNER
  ) {
    throw new ForbiddenException('Owner cannot self-demote');
  }
  if (
    access.member.memberRole === ChatMemberRole.ADMIN &&
    targetMember.memberRole === ChatMemberRole.ADMIN
  ) {
    throw new ForbiddenException('Admin cannot modify another admin');
  }

  const previousRole = targetMember.memberRole;
  if (previousRole === dto.memberRole) {
    return {
      memberId: targetMember.userId,
      previousRole,
      currentRole: targetMember.memberRole,
      updated: false,
      room: await this.getRoomDetail(organizationId, roomId, callerId, {
        includeMembers: false,
      }),
    };
  }

  targetMember.memberRole = dto.memberRole;
  await this.roomMemberRepo.save(targetMember);

  const roleEvent: ChatRoomMemberRoleUpdatedDomainEvent = {
    organizationId,
    roomId,
    actorUserId: callerId,
    memberUserId: targetMember.userId,
    previousRole,
    currentRole: targetMember.memberRole,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.ROOM_MEMBER_ROLE_UPDATED, roleEvent);
  await this.emitRoomUpdatedEvent({
    organizationId,
    roomId,
    updatedByUserId: callerId,
    changeType: 'member_role',
    room: access.room,
  });

  return {
    memberId: targetMember.userId,
    previousRole,
    currentRole: targetMember.memberRole,
    updated: true,
    room: await this.getRoomDetail(organizationId, roomId, callerId, {
      includeMembers: false,
    }),
  };
}
export async function transferRoomOwnership(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  callerId: string,
  dto: UpdateRoomOwnershipRequest,
): Promise<UpdateRoomOwnershipResponse> {
  await this.assertActiveOrgMember(organizationId, callerId);
  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    callerId,
  );

  if (access.member.memberRole !== ChatMemberRole.OWNER) {
    throw new ForbiddenException('Only owner can transfer room ownership');
  }
  if (access.room.roomType === ChatRoomType.DM) {
    throw new BadRequestException('DM room ownership cannot be transferred');
  }

  const targetMember = await this.roomMemberRepo.findOne({
    where: {
      organizationId,
      roomId,
      userId: dto.newOwnerUserId,
      isActive: true,
    },
  });
  if (!targetMember) {
    throw new NotFoundException('Target owner must be an active room member');
  }

  const previousOwnerUserId = access.room.ownerId ?? callerId;
  if (targetMember.userId === previousOwnerUserId) {
    return {
      roomId,
      previousOwnerUserId,
      currentOwnerUserId: previousOwnerUserId,
      updated: false,
      room: await this.getRoomDetail(organizationId, roomId, callerId, {
        includeMembers: false,
      }),
    };
  }

  await this.dataSource.transaction(async (manager) => {
    const callerMember = await manager.findOne(ChatRoomMember, {
      where: {
        organizationId,
        roomId,
        userId: callerId,
        isActive: true,
      },
    });
    const targetOwner = await manager.findOne(ChatRoomMember, {
      where: {
        organizationId,
        roomId,
        userId: dto.newOwnerUserId,
        isActive: true,
      },
    });
    if (!callerMember || !targetOwner) {
      throw new NotFoundException(
        'Cannot transfer ownership for inactive member',
      );
    }

    if (callerMember.userId !== targetOwner.userId) {
      callerMember.memberRole = ChatMemberRole.ADMIN;
      await manager.save(callerMember);
    }
    targetOwner.memberRole = ChatMemberRole.OWNER;
    await manager.save(targetOwner);

    access.room.ownerId = targetOwner.userId;
    await manager.save(access.room);
  });

  await this.emitRoomUpdatedEvent({
    organizationId,
    roomId,
    updatedByUserId: callerId,
    changeType: 'ownership_transferred',
    previousOwnerUserId,
    currentOwnerUserId: access.room.ownerId,
    room: access.room,
  });

  return {
    roomId,
    previousOwnerUserId,
    currentOwnerUserId: access.room.ownerId ?? dto.newOwnerUserId,
    updated: true,
    room: await this.getRoomDetail(organizationId, roomId, callerId, {
      includeMembers: false,
    }),
  };
}
export async function removeMember(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  targetUserId: string,
  callerId: string,
): Promise<RemoveRoomMemberResponse> {
  await this.assertActiveOrgMember(organizationId, callerId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    callerId,
  );
  const targetMember = await this.roomMemberRepo.findOne({
    where: { organizationId, roomId, userId: targetUserId, isActive: true },
  });
  if (!targetMember) {
    throw new NotFoundException('Target member not found in room');
  }

  const isSelfLeave = targetUserId === callerId;
  if (!isSelfLeave && !access.permissions.canManageMembers) {
    throw new ForbiddenException(
      'You do not have permission to remove members',
    );
  }

  if (!isSelfLeave && targetMember.memberRole === ChatMemberRole.OWNER) {
    throw new ForbiddenException('Cannot remove owner from room');
  }

  if (
    !isSelfLeave &&
    access.member.memberRole === ChatMemberRole.ADMIN &&
    targetMember.memberRole === ChatMemberRole.ADMIN
  ) {
    throw new ForbiddenException('Admin cannot remove another admin');
  }

  const previousOwnerUserId = access.room.ownerId;
  let transferredOwnerUserId: string | undefined;

  await this.dataSource.transaction(async (manager) => {
    if (isSelfLeave && targetMember.memberRole === ChatMemberRole.OWNER) {
      const activeMembers = await manager.find(ChatRoomMember, {
        where: { organizationId, roomId, isActive: true },
      });
      const replacement = activeMembers
        .filter((member) => member.userId !== targetUserId)
        .sort(
          (a, b) =>
            this.memberRolePriority(a.memberRole) -
            this.memberRolePriority(b.memberRole),
        )[0];

      if (!replacement) {
        throw new ForbiddenException(
          'Owner cannot leave room when there is no active replacement',
        );
      }

      replacement.memberRole = ChatMemberRole.OWNER;
      await manager.save(replacement);

      access.room.ownerId = replacement.userId;
      transferredOwnerUserId = replacement.userId;
      await manager.save(access.room);
    }

    targetMember.isActive = false;
    targetMember.leftAt = new Date();
    await manager.save(targetMember);
  });

  const memberRemovedEvent: ChatRoomMemberRemovedDomainEvent = {
    organizationId,
    roomId,
    actorUserId: callerId,
    memberUserId: targetUserId,
    removedBySelf: isSelfLeave,
    previousOwnerUserId,
    currentOwnerUserId: access.room.ownerId,
    occurredAt: new Date().toISOString(),
  };
  await this.bumpRoomMemberRoomsStateVersions({
    organizationId,
    roomId,
    extraUserIds: [targetUserId],
  });
  this.eventEmitter.emit(
    CHAT_BOX_EVENTS.ROOM_MEMBER_REMOVED,
    memberRemovedEvent,
  );
  await this.emitRoomMemberSystemMessage({
    organizationId,
    roomId,
    actorUserId: callerId,
    memberUserId: targetUserId,
    action: isSelfLeave ? 'left' : 'removed',
    removedBySelf: isSelfLeave,
  });
  await this.emitRoomUpdatedEvent({
    organizationId,
    roomId,
    updatedByUserId: callerId,
    changeType: 'member_removed',
    previousOwnerUserId,
    currentOwnerUserId: access.room.ownerId,
    room: access.room,
  });

  return {
    roomId,
    memberId: targetUserId,
    removedBySelf: isSelfLeave,
    previousOwnerUserId,
    currentOwnerUserId: access.room.ownerId,
    transferredOwnerUserId,
    room: await this.getRoomDetailIfAccessible(
      organizationId,
      roomId,
      callerId,
      { includeMembers: false },
    ),
  };
}
export async function getRoomAccessForCaller(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
): Promise<RoomAccessContext> {
  const room = await this.roomRepo.findOne({
    where: { id: roomId, organizationId },
  });
  if (!room) {
    throw new NotFoundException('Chat room not found');
  }
  await this.chatScopeAccessPolicyService.assertRoomScopeAccess(room, userId);

  const member = await this.roomMemberRepo.findOne({
    where: {
      organizationId,
      roomId,
      userId,
      isActive: true,
    },
  });
  if (!member) {
    throw new ForbiddenException('You are not a member of this room');
  }

  const permissions = this.buildRoomPermissions(
    member.memberRole,
    room.visibility,
    room.roomType,
    room.roomKey,
    room.contextScope,
    room.allowMemberPinMessages,
    room.allowGuestPinMessages,
  );

  return { room, member, permissions };
}
export function buildRoomPermissions(
  this: ChatBoxServiceDelegateContext,
  memberRole: ChatMemberRole,
  visibility: ChatRoomVisibility,
  roomType: ChatRoomType,
  roomKey?: string,
  contextScope?: ChatContextScope,
  allowMemberPinMessages = false,
  allowGuestPinMessages = false,
): RoomPermissionResponse {
  const isOrganizationAnnouncementsRoom =
    contextScope === ChatContextScope.ORGANIZATION &&
    roomType === ChatRoomType.CHANNEL &&
    isOrganizationAnnouncementsRoomKey(roomKey);
  const isPrivateChannel =
    roomType === ChatRoomType.CHANNEL &&
    visibility === ChatRoomVisibility.PRIVATE;
  const canToggleToPublic =
    roomType === ChatRoomType.CHANNEL &&
    visibility === ChatRoomVisibility.PRIVATE;
  const canToggleToPrivate =
    roomType === ChatRoomType.CHANNEL &&
    visibility === ChatRoomVisibility.PUBLIC;

  if (memberRole === ChatMemberRole.OWNER) {
    return {
      canView: true,
      canJoin: false,
      canSendMessage: true,
      canInviteMembers: true,
      canManageMembers: true,
      canLeave: true,
      canPinMessages: true,
      canChangeVisibilityToPublic: canToggleToPublic,
      canChangeVisibilityToPrivate: canToggleToPrivate,
    };
  }

  if (memberRole === ChatMemberRole.ADMIN) {
    return {
      canView: true,
      canJoin: false,
      canSendMessage: true,
      canInviteMembers: !isPrivateChannel,
      canManageMembers: true,
      canLeave: true,
      canPinMessages: true,
      canChangeVisibilityToPublic: canToggleToPublic,
      canChangeVisibilityToPrivate: canToggleToPrivate,
    };
  }

  if (memberRole === ChatMemberRole.MEMBER) {
    return {
      canView: true,
      canJoin: false,
      canSendMessage: !isOrganizationAnnouncementsRoom,
      canInviteMembers: false,
      canManageMembers: false,
      canLeave: true,
      canPinMessages: allowMemberPinMessages,
      canChangeVisibilityToPublic: false,
      canChangeVisibilityToPrivate: false,
    };
  }

  return {
    canView: true,
    canJoin: false,
    canSendMessage: false,
    canInviteMembers: false,
    canManageMembers: false,
    canLeave: true,
    canPinMessages: allowGuestPinMessages,
    canChangeVisibilityToPublic: false,
    canChangeVisibilityToPrivate: false,
  };
}
export function buildDefaultRoomPolicies(
  this: ChatBoxServiceDelegateContext,
  roomType: ChatRoomType,
): {
  allowMemberPinMessages: boolean;
  allowGuestPinMessages: boolean;
} {
  return {
    allowMemberPinMessages:
      roomType === ChatRoomType.DM || roomType === ChatRoomType.GROUP_DM,
    allowGuestPinMessages: false,
  };
}
export async function assertActiveOrgMember(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
): Promise<OrganizationMember> {
  const [organization, member] = await Promise.all([
    this.organizationRepo.findOne({
      where: { id: organizationId, isActive: true },
    }),
    this.organizationMemberRepo.findOne({
      where: {
        organizationId,
        userId,
        isActive: true,
        isDeleted: false,
      },
    }),
  ]);

  if (!organization) {
    throw new NotFoundException('Organization not found');
  }
  if (!member) {
    throw new ForbiddenException('You are not an active organization member');
  }
  return member;
}
export async function ensureUsersAreActiveOrgMembers(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;

  const members = await this.organizationMemberRepo.find({
    where: {
      organizationId,
      userId: In(userIds),
      isActive: true,
      isDeleted: false,
    },
    select: ['userId'],
  });

  const existingSet = new Set(members.map((member) => member.userId));
  const missing = userIds.filter((id) => !existingSet.has(id));

  if (missing.length > 0) {
    throw new BadRequestException(
      `Users are not active members of organization: ${missing.join(', ')}`,
    );
  }
}
export function buildRequestedRoomKey(
  this: ChatBoxServiceDelegateContext,
  params: {
    roomType: ChatRoomType;
    roomKey?: string;
    name?: string;
    contextScope: ChatContextScope;
    contextId?: string;
    ownerId: string;
    requestedMemberIds: string[];
  },
): string | undefined {
  if (params.roomType === ChatRoomType.DM) {
    const participants = [params.ownerId, ...params.requestedMemberIds].sort();
    const scopePrefix =
      params.contextScope === ChatContextScope.PROJECT && params.contextId
        ? `project-${params.contextId}-`
        : '';
    return `${scopePrefix}dm-${participants.join('-')}`;
  }

  if (params.roomKey) {
    return this.normalizeRoomKey(params.roomKey);
  }

  if (params.roomType === ChatRoomType.CHANNEL && params.name) {
    return this.normalizeRoomKey(params.name);
  }

  if (params.roomType === ChatRoomType.GROUP_DM) {
    const baseName = params.name || `group-${Date.now()}`;
    return this.normalizeRoomKey(baseName);
  }

  return undefined;
}
export function normalizeRoomKey(
  this: ChatBoxServiceDelegateContext,
  value: string,
): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
  return normalized || `room-${Date.now()}`;
}
export async function resolveUniqueRoomKey(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  baseRoomKey: string,
): Promise<string> {
  let roomKey = baseRoomKey;
  let seq = 1;

  while (true) {
    const existing = await this.roomRepo.findOne({
      where: { organizationId, roomKey },
      select: ['id'],
    });
    if (!existing) {
      return roomKey;
    }

    const suffix = `-${seq}`;
    roomKey = `${baseRoomKey.slice(0, Math.max(1, 255 - suffix.length))}${suffix}`;
    seq += 1;
  }
}
export async function ensureDmMemberships(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  ownerId: string,
  memberId?: string,
): Promise<void> {
  const members = [
    {
      organizationId,
      roomId,
      userId: ownerId,
      memberRole: ChatMemberRole.OWNER,
    },
    ...(memberId && memberId !== ownerId
      ? [
          {
            organizationId,
            roomId,
            userId: memberId,
            memberRole: ChatMemberRole.MEMBER,
          },
        ]
      : []),
  ];

  for (const member of members) {
    const existing = await this.roomMemberRepo.findOne({
      where: {
        organizationId,
        roomId,
        userId: member.userId,
      },
    });
    if (!existing) {
      await this.roomMemberRepo.save(
        this.roomMemberRepo.create({
          ...member,
          joinSource: ChatJoinSource.MANUAL,
          isActive: true,
        }),
      );
      continue;
    }

    if (!existing.isActive) {
      existing.isActive = true;
      existing.leftAt = undefined;
    }
    if (existing.memberRole === ChatMemberRole.GUEST) {
      existing.memberRole = member.memberRole;
    }
    await this.roomMemberRepo.save(existing);
  }
}
export function buildUserDisplayName(
  this: ChatBoxServiceDelegateContext,
  params: {
    userId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  },
): string {
  const fullName = [params.firstName, params.lastName]
    .filter((part) => Boolean(part))
    .join(' ')
    .trim();
  if (fullName) {
    return fullName;
  }

  return params.email || params.userId;
}
export async function resolveArchivedByDisplayName(
  this: ChatBoxServiceDelegateContext,
  userId?: string,
): Promise<string | undefined> {
  if (!userId) {
    return undefined;
  }
  const user = await this.userRepo.findOne({ where: { id: userId } });
  return this.buildUserDisplayName({
    userId,
    email: user?.email,
    firstName: user?.firstName,
    lastName: user?.lastName,
  });
}
export function normalizeRoomTabs(
  this: ChatBoxServiceDelegateContext,
  tabs?: ChatRoomTabConfigItem[] | null,
): ChatRoomTabConfigItem[] {
  const source =
    tabs && tabs.length > 0 ? tabs : this.constructor.DEFAULT_ROOM_TABS;

  const normalized = source
    .map((item) => ({
      id: item.id?.trim(),
      order: Number(item.order),
      hidden: Boolean(item.hidden),
    }))
    .filter((item) => Boolean(item.id) && Number.isFinite(item.order))
    .sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.id.localeCompare(b.id);
    })
    .map((item, index) => ({
      id: item.id as string,
      order: index + 1,
      hidden: item.hidden,
    }));

  if (normalized.length === 0) {
    return this.constructor.DEFAULT_ROOM_TABS.map((item) => ({ ...item }));
  }

  return normalized;
}
export function validateRoomTabs(
  this: ChatBoxServiceDelegateContext,
  tabs: ChatRoomTabConfigItem[],
): void {
  if (tabs.length === 0) {
    throw new BadRequestException('tabs must contain at least one item');
  }

  const idSet = new Set<string>();
  for (const tab of tabs) {
    if (!tab.id || tab.id.length === 0) {
      throw new BadRequestException('tabs[].id is required');
    }
    if (idSet.has(tab.id)) {
      throw new BadRequestException('tabs[].id must be unique');
    }
    idSet.add(tab.id);
  }

  const messagesTab = tabs.find((item) => item.id === 'messages');
  if (!messagesTab) {
    throw new BadRequestException('messages tab is required');
  }
  if (messagesTab.hidden) {
    throw new BadRequestException('messages tab cannot be hidden');
  }
}
export function toRoomSummary(
  this: ChatBoxServiceDelegateContext,
  room: ChatRoom,
  myRole: ChatMemberRole,
  memberCount: number,
  myPermissions: RoomPermissionResponse,
  myNotifyLevel: ChatNotifyLevel,
  isHiddenByUser: boolean,
  hiddenReason: ChatHiddenReason | undefined,
  hiddenAt: Date | undefined,
  isStarred: boolean,
  starredAt?: Date,
  createdByDisplayName?: string,
  archivedByDisplayName?: string,
  viewerState: RoomViewerStateResponse = {
    membershipStatus: ChatRoomViewerMembershipStatus.MEMBER,
    isInvited: false,
    canViewPreview: true,
    canJoin: false,
  },
  isManualUnreadByUser = false,
  manualUnreadAt?: Date,
  manualUnreadFromMessageId?: string,
): RoomSummaryResponse {
  return {
    id: room.id,
    organizationId: room.organizationId,
    roomType: room.roomType,
    visibility: room.visibility,
    name: room.name,
    roomKey: room.roomKey,
    topic: room.topic,
    description: room.description,
    contextScope: room.contextScope,
    contextId: room.contextId,
    createdBy: room.createdBy,
    createdByDisplayName: createdByDisplayName ?? room.createdBy,
    ownerId: room.ownerId,
    lastMessageAt: room.lastMessageAt,
    isArchived: room.isArchived,
    archivedAt: room.archivedAt,
    archivedByUserId: room.archivedByUserId,
    archivedByDisplayName: archivedByDisplayName ?? room.archivedByUserId,
    myNotifyLevel,
    isHiddenByUser,
    hiddenReason,
    hiddenAt,
    canUnarchive: myPermissions.canManageMembers && room.isArchived,
    canUnhide: isHiddenByUser,
    isStarred,
    starredAt,
    allowMemberPinMessages: room.allowMemberPinMessages,
    allowGuestPinMessages: room.allowGuestPinMessages,
    myRole,
    memberCount,
    isManualUnreadByUser,
    manualUnreadAt,
    manualUnreadFromMessageId,
    myPermissions,
    viewerState,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}
export function toRoomMemberResponse(
  this: ChatBoxServiceDelegateContext,
  member: ChatRoomMember,
  user?: User,
): RoomMemberResponse {
  return {
    userId: member.userId,
    memberRole: member.memberRole,
    joinSource: member.joinSource,
    notifyLevel: member.notifyLevel,
    isActive: member.isActive,
    isHidden: member.isHidden,
    hiddenReason: member.hiddenReason,
    hiddenAt: member.hiddenAt,
    joinedAt: member.joinedAt,
    leftAt: member.leftAt,
    email: user?.email,
    firstName: user?.firstName,
    lastName: user?.lastName,
  };
}
export function toRoomInvitationResponse(
  this: ChatBoxServiceDelegateContext,
  invitation: ChatRoomInvitation,
): RoomInvitationResponse {
  return {
    id: invitation.id,
    roomId: invitation.roomId,
    organizationId: invitation.organizationId,
    invitedUserId: invitation.invitedUserId,
    invitedBy: invitation.invitedBy,
    status: invitation.status,
    memberRole: invitation.memberRole,
    inviteMessage: invitation.inviteMessage,
    acceptedAt: invitation.acceptedAt,
    createdAt: invitation.createdAt,
  };
}
export async function getActiveMemberCountMap(
  this: ChatBoxServiceDelegateContext,
  roomIds: string[],
): Promise<Map<string, number>> {
  if (roomIds.length === 0) {
    return new Map();
  }

  const counts = await this.roomMemberRepo
    .createQueryBuilder('rm')
    .select('rm.room_id', 'roomId')
    .addSelect('COUNT(*)', 'memberCount')
    .where('rm.room_id IN (:...roomIds)', { roomIds })
    .andWhere('rm.is_active = true')
    .groupBy('rm.room_id')
    .getRawMany<{ roomId: string; memberCount: string }>();

  return new Map(counts.map((row) => [row.roomId, Number(row.memberCount)]));
}
export function memberRolePriority(
  this: ChatBoxServiceDelegateContext,
  role: ChatMemberRole,
): number {
  switch (role) {
    case ChatMemberRole.ADMIN:
      return 1;
    case ChatMemberRole.MEMBER:
      return 2;
    case ChatMemberRole.GUEST:
      return 3;
    case ChatMemberRole.OWNER:
    default:
      return 0;
  }
}
export async function getRoomDetailIfAccessible(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  options?: {
    includeMembers?: boolean;
  },
): Promise<RoomDetailResponse | undefined> {
  try {
    return await this.getRoomDetail(organizationId, roomId, userId, options);
  } catch (error) {
    if (
      error instanceof ForbiddenException ||
      error instanceof NotFoundException
    ) {
      return undefined;
    }
    throw error;
  }
}
export async function syncAcceptedInvitationNotification(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    invitation: ChatRoomInvitation;
    acceptedAt: Date;
    room?: ChatRoom;
  },
): Promise<void> {
  const [inviter, room] = await Promise.all([
    this.userRepo.findOne({
      where: { id: params.invitation.invitedBy },
    }),
    params.room
      ? Promise.resolve(params.room)
      : this.roomRepo.findOne({
          where: {
            id: params.invitation.roomId,
            organizationId: params.organizationId,
          },
          select: ['id', 'roomType', 'name', 'roomKey'],
        }),
  ]);

  await this.notificationService.updateInvitationStatus({
    userId: params.invitation.invitedUserId,
    invitationId: params.invitation.id,
    invitationStatus: ChatRoomInvitationStatus.ACCEPTED,
    roomId: params.invitation.roomId,
    roomName: this.resolveRoomLabelForNotification(room),
    invitedByUserId: params.invitation.invitedBy,
    invitedByDisplayName: this.buildUserDisplayName({
      userId: params.invitation.invitedBy,
      email: inviter?.email,
      firstName: inviter?.firstName,
      lastName: inviter?.lastName,
    }),
    memberRole: this.resolveInvitationMemberRole(params.invitation.memberRole),
    acceptedAt: params.acceptedAt,
  });
}
export function resolveRoomLabelForNotification(
  this: ChatBoxServiceDelegateContext,
  room?: Pick<ChatRoom, 'roomType' | 'name' | 'roomKey'> | null,
): string | undefined {
  if (!room) {
    return undefined;
  }
  if (room.roomType === ChatRoomType.DM) {
    return 'direct chat';
  }
  if (room.roomType === ChatRoomType.GROUP_DM) {
    return room.name?.trim() || 'group chat';
  }
  return room.name?.trim() || room.roomKey?.trim() || 'channel';
}
export function resolveInvitationMemberRole(
  this: ChatBoxServiceDelegateContext,
  role?: ChatMemberRole,
): ChatMemberRole {
  if (!role || role === ChatMemberRole.OWNER) {
    return ChatMemberRole.MEMBER;
  }
  return role;
}
export async function emitRoomMemberSystemMessage(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    actorUserId: string;
    memberUserId: string;
    action: 'joined' | 'left' | 'removed';
    joinSource?: ChatJoinSource;
    removedBySelf?: boolean;
  },
): Promise<void> {
  const [actor, member] = await Promise.all([
    this.userRepo.findOne({ where: { id: params.actorUserId } }),
    this.userRepo.findOne({ where: { id: params.memberUserId } }),
  ]);

  const actorDisplayName = this.buildUserDisplayName({
    userId: params.actorUserId,
    email: actor?.email,
    firstName: actor?.firstName,
    lastName: actor?.lastName,
  });
  const memberDisplayName = this.buildUserDisplayName({
    userId: params.memberUserId,
    email: member?.email,
    firstName: member?.firstName,
    lastName: member?.lastName,
  });

  let content = `${memberDisplayName} joined the room`;
  if (params.action === 'left') {
    content = `${memberDisplayName} left the room`;
  } else if (params.action === 'removed') {
    content = `${memberDisplayName} was removed from the room by ${actorDisplayName}`;
  }

  const sentAt = new Date();
  const message = await this.dataSource.transaction(async (manager) => {
    const systemMessage = manager.create(ChatMessage, {
      organizationId: params.organizationId,
      roomId: params.roomId,
      messageType: ChatMessageType.SYSTEM,
      content,
      metadata: {
        systemEventType: `room.member.${params.action}`,
        actorUserId: params.actorUserId,
        actorDisplayName,
        memberUserId: params.memberUserId,
        memberDisplayName,
        joinSource: params.joinSource,
        removedBySelf: params.removedBySelf ?? false,
      },
      sentAt,
    });
    const savedMessage = await manager.save(systemMessage);

    await manager.update(
      ChatRoom,
      {
        id: params.roomId,
        organizationId: params.organizationId,
      },
      {
        lastMessageId: savedMessage.id,
        lastMessageAt: savedMessage.sentAt,
      },
    );

    return savedMessage;
  });

  const messageResponse = this.toRoomMessageResponse(message);
  const messageEvent: ChatMessageDomainEvent = {
    organizationId: params.organizationId,
    roomId: params.roomId,
    actorUserId: params.actorUserId,
    message: messageResponse,
    roomDelta: {
      roomId: params.roomId,
      reason: 'message_created',
      messageId: messageResponse.id,
      lastMessageId: messageResponse.id,
      lastMessageAt: messageResponse.sentAt,
      lastMessageSnippet: messageResponse.content || '[system message]',
      shouldRefreshRoomSummary: false,
    },
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_CREATED, messageEvent);
}
export async function emitRoomVisibilitySystemMessage(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    actorUserId: string;
    visibility: ChatRoomVisibility;
  },
): Promise<void> {
  const actor = await this.userRepo.findOne({
    where: { id: params.actorUserId },
  });
  const actorDisplayName = this.buildUserDisplayName({
    userId: params.actorUserId,
    email: actor?.email,
    firstName: actor?.firstName,
    lastName: actor?.lastName,
  });
  const visibilityLabel =
    params.visibility === ChatRoomVisibility.PUBLIC ? 'public' : 'private';
  const sentAt = new Date();

  const message = await this.dataSource.transaction(async (manager) => {
    const systemMessage = manager.create(ChatMessage, {
      organizationId: params.organizationId,
      roomId: params.roomId,
      messageType: ChatMessageType.SYSTEM,
      content: `${actorDisplayName} changed this channel to ${visibilityLabel}`,
      metadata: {
        systemEventType: 'room.visibility.changed',
        actorUserId: params.actorUserId,
        actorDisplayName,
        visibility: params.visibility,
      },
      sentAt,
    });
    const savedMessage = await manager.save(systemMessage);

    await manager.update(
      ChatRoom,
      {
        id: params.roomId,
        organizationId: params.organizationId,
      },
      {
        lastMessageId: savedMessage.id,
        lastMessageAt: savedMessage.sentAt,
      },
    );

    return savedMessage;
  });

  const messageEvent: ChatMessageDomainEvent = {
    organizationId: params.organizationId,
    roomId: params.roomId,
    actorUserId: params.actorUserId,
    message: this.toRoomMessageResponse(message),
    roomDelta: {
      roomId: params.roomId,
      reason: 'message_created',
      messageId: message.id,
      lastMessageId: message.id,
      lastMessageAt: message.sentAt,
      lastMessageSnippet: message.content || '[system message]',
      shouldRefreshRoomSummary: false,
    },
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_CREATED, messageEvent);
}
