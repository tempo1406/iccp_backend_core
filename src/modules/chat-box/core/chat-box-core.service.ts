/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return */
import { CacheService } from '@modules/cache/cache.service';
import * as chatBoxMessageService from '@modules/chat-box/delegates/chat-box-message.delegate';
import * as chatBoxPresenceService from '@modules/chat-box/delegates/chat-box-presence.delegate';
import * as chatBoxRoomService from '@modules/chat-box/delegates/chat-box-room.delegate';
import { ChatScopeAccessPolicyService } from '@modules/chat-box/policies/chat-scope-access-policy.service';
import { ChatBackgroundQueueService } from '@modules/chat-box/workers/chat-background-queue.service';
import { ChatLinkPreviewService } from '@modules/chat-box/link-preview/chat-link-preview.service';
import {
  ChatAttachmentDocumentType,
  ChatAttachmentPreviewStatus,
  ChatAttachmentType,
  ChatMessageAttachment,
} from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ChatMessageDraft } from '@modules/chat-box/message-management/entities/message-draft.entity';
import { ChatMessageMention } from '@modules/chat-box/message-management/entities/message-mention.entity';
import { ChatMessagePin } from '@modules/chat-box/message-management/entities/message-pin.entity';
import { ChatMessageReaction } from '@modules/chat-box/message-management/entities/message-reaction.entity';
import {
  ChatMessage,
  ChatMessageType,
} from '@modules/chat-box/message-management/entities/message.entity';
import { ChatReadState } from '@modules/chat-box/message-management/entities/read-state.entity';
import { ChatScheduledMessage } from '@modules/chat-box/message-management/entities/scheduled-message.entity';
import { ChatUserPresence } from '@modules/chat-box/presence/entities/user-presence.entity';
import { RoomPermissionResponse } from '@modules/chat-box/room-management/dto/response/room-permission.response';
import { ChatRoomInvitation } from '@modules/chat-box/room-management/entities/room-invitation.entity';
import { ChatRoomMember } from '@modules/chat-box/room-management/entities/room-member.entity';
import {
  ChatRoomTabConfig,
  ChatRoomTabConfigItem,
} from '@modules/chat-box/room-management/entities/room-tab-config.entity';
import { ChatRoom } from '@modules/chat-box/room-management/entities/room.entity';
import { ImageKitService } from '@modules/imagekit/imagekit.service';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { User } from '@modules/users/entities/user.entity';
import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { DataSource, Repository } from 'typeorm';

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
  richContent?: Record<string, any>;
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

@Injectable()
export class ChatBoxCoreService implements OnModuleInit, OnModuleDestroy {
  private static readonly MAX_ACTIVE_PINS_PER_ROOM = 10;
  private static readonly AUTO_AWAY_IDLE_MS = 10 * 60_000;
  private static readonly ATTACHMENT_PREVIEW_WORKER_INTERVAL_MS = 1_000;
  private static readonly ATTACHMENT_PREVIEW_RENDER_TIMEOUT_MS = 15_000;
  private static readonly ATTACHMENT_PREVIEW_MAX_RETRIES = 3;
  private static readonly ATTACHMENT_PREVIEW_MAX_RENDER_BYTES =
    50 * 1024 * 1024;
  private static readonly ATTACHMENT_PREVIEW_CACHE_TTL_MS = 6 * 60 * 60_000;
  private static readonly ATTACHMENT_PREVIEW_METRICS_LOG_WINDOW_MS = 60_000;
  private static readonly ATTACHMENT_PREVIEW_MAX_RETRY_DELAY_MS = 30_000;
  private static readonly ATTACHMENT_PREVIEW_QUEUE_JOB_LOCK_TTL_MS = 30_000;
  private static readonly ATTACHMENT_PREVIEW_QUEUE_CLAIM_BATCH_SIZE = 1;
  private static readonly DRAFT_LIST_MAX_LIMIT = 50;
  private static readonly SCHEDULED_LIST_MAX_LIMIT = 50;
  private static readonly SCHEDULED_MAX_AHEAD_DAYS = 120;
  private static readonly SCHEDULED_MESSAGE_WORKER_INTERVAL_MS = 1_000;
  private static readonly SCHEDULED_MESSAGE_WORKER_BATCH_SIZE = 20;
  private static readonly SCHEDULED_MESSAGE_QUEUE_JOB_LOCK_TTL_MS = 45_000;
  private static readonly SCHEDULED_QUEUE_HYDRATE_INTERVAL_MS = 30_000;
  private static readonly SCHEDULED_QUEUE_HYDRATE_BATCH_SIZE = 100;
  private static readonly SCHEDULED_MESSAGE_WORKER_LOCK_TTL_MS = 8_000;
  private static readonly PERF_METRIC_LOG_WINDOW_MS = 60_000;
  private static readonly PERF_LATENCY_WARN_THRESHOLD_MS = 500;
  private static readonly ATTACHMENT_THUMBNAIL_SMALL_TRANSFORM =
    'w-240,q-60,f-webp';
  private static readonly ATTACHMENT_THUMBNAIL_MEDIUM_TRANSFORM =
    'w-480,q-70,f-webp';
  private static readonly OFFICE_PREVIEW_RENDERER_ENDPOINT =
    process.env.CHAT_BOX_OFFICE_PREVIEW_RENDERER_ENDPOINT?.trim();
  private static readonly MAX_UPLOAD_FILE_SIZE_BYTES_BY_TYPE: Record<
    ChatAttachmentType,
    number
  > = {
    [ChatAttachmentType.IMAGE]: 15 * 1024 * 1024,
    [ChatAttachmentType.VIDEO]: 250 * 1024 * 1024,
    [ChatAttachmentType.AUDIO]: 50 * 1024 * 1024,
    [ChatAttachmentType.FILE]: 100 * 1024 * 1024,
  };
  private static readonly ALLOWED_FILE_EXTENSIONS = new Set([
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'bmp',
    'svg',
    'mp4',
    'mov',
    'avi',
    'mkv',
    'webm',
    'mp3',
    'wav',
    'ogg',
    'm4a',
    'aac',
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'csv',
    'txt',
    'zip',
    'rar',
    '7z',
    'json',
    'md',
  ]);
  private static readonly IMAGE_MIME_PREFIX = 'image/';
  private static readonly VIDEO_MIME_PREFIX = 'video/';
  private static readonly AUDIO_MIME_PREFIX = 'audio/';
  private readonly logger = new Logger(ChatBoxCoreService.name);
  private attachmentPreviewWorkerTimer?: NodeJS.Timeout;
  private attachmentPreviewMetricsTimer?: NodeJS.Timeout;
  private attachmentPreviewWorkerBusy = false;
  private scheduledMessageWorkerTimer?: NodeJS.Timeout;
  private scheduledMessageWorkerBusy = false;
  private scheduledQueueLastHydratedAt = 0;
  private perfMetricsTimer?: NodeJS.Timeout;
  private readonly instanceId = randomUUID();
  private readonly perfLatencySummary = new Map<
    string,
    {
      count: number;
      errorCount: number;
      totalMs: number;
      maxMs: number;
    }
  >();
  private readonly attachmentPreviewResultCache = new Map<
    string,
    {
      result: AttachmentPreviewResult;
      expiresAt: number;
    }
  >();
  private readonly attachmentPreviewMetrics = {
    queued: 0,
    processed: 0,
    failed: 0,
    retried: 0,
    deadLettered: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
  private static readonly DEFAULT_ROOM_TABS: ChatRoomTabConfigItem[] = [
    { id: 'messages', order: 1, hidden: false },
    { id: 'files', order: 2, hidden: false },
    { id: 'photos', order: 3, hidden: false },
    { id: 'pins', order: 4, hidden: false },
  ];

  constructor(
    @InjectRepository(ChatRoom)
    private readonly roomRepo: Repository<ChatRoom>,

    @InjectRepository(ChatRoomTabConfig)
    private readonly roomTabConfigRepo: Repository<ChatRoomTabConfig>,

    @InjectRepository(ChatRoomMember)
    private readonly roomMemberRepo: Repository<ChatRoomMember>,

    @InjectRepository(ChatRoomInvitation)
    private readonly invitationRepo: Repository<ChatRoomInvitation>,

    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,

    @InjectRepository(ChatMessageAttachment)
    private readonly attachmentRepo: Repository<ChatMessageAttachment>,

    @InjectRepository(ChatMessageDraft)
    private readonly draftRepo: Repository<ChatMessageDraft>,

    @InjectRepository(ChatMessagePin)
    private readonly pinRepo: Repository<ChatMessagePin>,

    @InjectRepository(ChatReadState)
    private readonly readStateRepo: Repository<ChatReadState>,

    @InjectRepository(ChatScheduledMessage)
    private readonly scheduledMessageRepo: Repository<ChatScheduledMessage>,

    @InjectRepository(ChatMessageReaction)
    private readonly reactionRepo: Repository<ChatMessageReaction>,

    @InjectRepository(ChatMessageMention)
    private readonly mentionRepo: Repository<ChatMessageMention>,

    @InjectRepository(ChatUserPresence)
    private readonly presenceRepo: Repository<ChatUserPresence>,

    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,

    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepo: Repository<OrganizationMember>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly imagekitService: ImageKitService,

    private readonly notificationService: NotificationCoreService,

    private readonly cacheService: CacheService,

    private readonly chatLinkPreviewService: ChatLinkPreviewService,

    private readonly chatBackgroundQueueService: ChatBackgroundQueueService,

    private readonly chatScopeAccessPolicyService: ChatScopeAccessPolicyService,

    private readonly eventEmitter: EventEmitter2,

    private readonly dataSource: DataSource,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  onModuleInit(): void {
    if (!this.attachmentPreviewWorkerTimer) {
      this.attachmentPreviewWorkerTimer = setInterval(() => {
        this.processAttachmentPreviewQueue().catch((error) => {
          this.logger.warn(
            `Attachment preview worker loop failed: ${(error as Error).message}`,
          );
        });
      }, ChatBoxCoreService.ATTACHMENT_PREVIEW_WORKER_INTERVAL_MS);
    }

    if (!this.attachmentPreviewMetricsTimer) {
      this.attachmentPreviewMetricsTimer = setInterval(() => {
        this.flushAttachmentPreviewMetrics();
      }, ChatBoxCoreService.ATTACHMENT_PREVIEW_METRICS_LOG_WINDOW_MS);
    }

    if (!this.scheduledMessageWorkerTimer) {
      this.scheduledMessageWorkerTimer = setInterval(() => {
        this.runScheduledMessageWorkerTick().catch((error) => {
          this.logger.warn(
            `Scheduled message worker loop failed: ${(error as Error).message}`,
          );
        });
      }, ChatBoxCoreService.SCHEDULED_MESSAGE_WORKER_INTERVAL_MS);
    }
    if (!this.perfMetricsTimer) {
      this.perfMetricsTimer = setInterval(() => {
        this.flushPerfLatencySummary();
        void this.chatBackgroundQueueService.logQueueSnapshot();
      }, ChatBoxCoreService.PERF_METRIC_LOG_WINDOW_MS);
    }
  }

  onModuleDestroy(): void {
    if (this.attachmentPreviewWorkerTimer) {
      clearInterval(this.attachmentPreviewWorkerTimer);
      this.attachmentPreviewWorkerTimer = undefined;
    }
    if (this.attachmentPreviewMetricsTimer) {
      clearInterval(this.attachmentPreviewMetricsTimer);
      this.attachmentPreviewMetricsTimer = undefined;
    }
    if (this.scheduledMessageWorkerTimer) {
      clearInterval(this.scheduledMessageWorkerTimer);
      this.scheduledMessageWorkerTimer = undefined;
    }
    if (this.perfMetricsTimer) {
      clearInterval(this.perfMetricsTimer);
      this.perfMetricsTimer = undefined;
    }
  }

  private async runScheduledMessageWorkerTick(): Promise<void> {
    const startedAt = Date.now();
    const lockKey = 'chat:worker:scheduled-message:v1:lock';
    const lockToken = `${this.instanceId}:${startedAt}`;
    const acquired = await this.tryAcquireRedisLock(
      lockKey,
      lockToken,
      ChatBoxCoreService.SCHEDULED_MESSAGE_WORKER_LOCK_TTL_MS,
    );
    if (!acquired) {
      return;
    }

    let failed = false;
    try {
      await this.processScheduledMessageQueue();
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      await this.releaseRedisLock(lockKey, lockToken);
      const durationMs = Date.now() - startedAt;
      this.recordPerfLatency(
        'scheduled_message_worker_tick',
        durationMs,
        failed,
      );
    }
  }

  private async tryAcquireRedisLock(
    lockKey: string,
    token: string,
    ttlMs: number,
  ): Promise<boolean> {
    try {
      const result = await this.redis.set(lockKey, token, 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.warn(
        `Redis lock acquire failed for key=${lockKey}, fallback to local execution: ${(error as Error).message}`,
      );
      return true;
    }
  }

  private async releaseRedisLock(
    lockKey: string,
    token: string,
  ): Promise<void> {
    try {
      await this.redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        lockKey,
        token,
      );
    } catch (error) {
      this.logger.warn(
        `Redis lock release failed for key=${lockKey}: ${(error as Error).message}`,
      );
    }
  }

  private async withPerfLatency<T>(
    operation: string,
    executor: () => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await executor();
      const durationMs = Date.now() - startedAt;
      this.recordPerfLatency(operation, durationMs, false);
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.recordPerfLatency(operation, durationMs, true);
      throw error;
    }
  }

  private recordPerfLatency(
    operation: string,
    durationMs: number,
    isError: boolean,
  ): void {
    const current = this.perfLatencySummary.get(operation) ?? {
      count: 0,
      errorCount: 0,
      totalMs: 0,
      maxMs: 0,
    };

    current.count += 1;
    current.totalMs += durationMs;
    current.maxMs = Math.max(current.maxMs, durationMs);
    if (isError) {
      current.errorCount += 1;
    }
    this.perfLatencySummary.set(operation, current);

    if (durationMs >= ChatBoxCoreService.PERF_LATENCY_WARN_THRESHOLD_MS) {
      this.logger.warn(
        `[chat-perf] op=${operation} durationMs=${durationMs} error=${isError}`,
      );
    }
  }

  private flushPerfLatencySummary(): void {
    if (this.perfLatencySummary.size === 0) {
      return;
    }

    for (const [operation, metric] of this.perfLatencySummary.entries()) {
      if (metric.count === 0) {
        continue;
      }
      const avgMs = Math.round(metric.totalMs / metric.count);
      this.logger.debug(
        `[chat-perf-summary] op=${operation} count=${metric.count} errors=${metric.errorCount} avgMs=${avgMs} maxMs=${metric.maxMs}`,
      );
    }
    this.perfLatencySummary.clear();
  }

  async createRoom(
    ...args: Parameters<typeof chatBoxRoomService.createRoom>
  ): ReturnType<typeof chatBoxRoomService.createRoom> {
    return chatBoxRoomService.createRoom.apply(this, args as any);
  }

  async listMyRooms(
    ...args: Parameters<typeof chatBoxRoomService.listMyRooms>
  ): ReturnType<typeof chatBoxRoomService.listMyRooms> {
    return this.withPerfLatency('chat.list_my_rooms', async () =>
      chatBoxRoomService.listMyRooms.apply(this, args as any),
    ) as ReturnType<typeof chatBoxRoomService.listMyRooms>;
  }

  async discoverPublicRooms(
    ...args: Parameters<typeof chatBoxRoomService.discoverPublicRooms>
  ): ReturnType<typeof chatBoxRoomService.discoverPublicRooms> {
    return this.withPerfLatency('chat.discover_public_rooms', async () =>
      chatBoxRoomService.discoverPublicRooms.apply(this, args as any),
    ) as ReturnType<typeof chatBoxRoomService.discoverPublicRooms>;
  }

  async listCreateRoomCandidates(
    ...args: Parameters<typeof chatBoxRoomService.listCreateRoomCandidates>
  ): ReturnType<typeof chatBoxRoomService.listCreateRoomCandidates> {
    return chatBoxRoomService.listCreateRoomCandidates.apply(this, args as any);
  }

  async getRoomDetail(
    ...args: Parameters<typeof chatBoxRoomService.getRoomDetail>
  ): ReturnType<typeof chatBoxRoomService.getRoomDetail> {
    return chatBoxRoomService.getRoomDetail.apply(this, args as any);
  }

  async getRoomBootstrap(
    ...args: Parameters<typeof chatBoxRoomService.getRoomBootstrap>
  ): ReturnType<typeof chatBoxRoomService.getRoomBootstrap> {
    return this.withPerfLatency('chat.room_bootstrap', async () =>
      chatBoxRoomService.getRoomBootstrap.apply(this, args as any),
    ) as ReturnType<typeof chatBoxRoomService.getRoomBootstrap>;
  }

  async getRoomPreview(
    ...args: Parameters<typeof chatBoxRoomService.getRoomPreview>
  ): ReturnType<typeof chatBoxRoomService.getRoomPreview> {
    return this.withPerfLatency('chat.room_preview', async () =>
      chatBoxRoomService.getRoomPreview.apply(this, args as any),
    ) as ReturnType<typeof chatBoxRoomService.getRoomPreview>;
  }

  async updateRoomInfo(
    ...args: Parameters<typeof chatBoxRoomService.updateRoomInfo>
  ): ReturnType<typeof chatBoxRoomService.updateRoomInfo> {
    return chatBoxRoomService.updateRoomInfo.apply(this, args as any);
  }

  async updateRoomVisibility(
    ...args: Parameters<typeof chatBoxRoomService.updateRoomVisibility>
  ): ReturnType<typeof chatBoxRoomService.updateRoomVisibility> {
    return chatBoxRoomService.updateRoomVisibility.apply(this, args as any);
  }

  async archiveRoom(
    ...args: Parameters<typeof chatBoxRoomService.archiveRoom>
  ): ReturnType<typeof chatBoxRoomService.archiveRoom> {
    return chatBoxRoomService.archiveRoom.apply(this, args as any);
  }

  async unarchiveRoom(
    ...args: Parameters<typeof chatBoxRoomService.unarchiveRoom>
  ): ReturnType<typeof chatBoxRoomService.unarchiveRoom> {
    return chatBoxRoomService.unarchiveRoom.apply(this, args as any);
  }

  async getRoomTabs(
    ...args: Parameters<typeof chatBoxRoomService.getRoomTabs>
  ): ReturnType<typeof chatBoxRoomService.getRoomTabs> {
    return chatBoxRoomService.getRoomTabs.apply(this, args as any);
  }

  async updateRoomTabs(
    ...args: Parameters<typeof chatBoxRoomService.updateRoomTabs>
  ): ReturnType<typeof chatBoxRoomService.updateRoomTabs> {
    return chatBoxRoomService.updateRoomTabs.apply(this, args as any);
  }

  async starRoom(
    ...args: Parameters<typeof chatBoxRoomService.starRoom>
  ): ReturnType<typeof chatBoxRoomService.starRoom> {
    return chatBoxRoomService.starRoom.apply(this, args as any);
  }

  async unstarRoom(
    ...args: Parameters<typeof chatBoxRoomService.unstarRoom>
  ): ReturnType<typeof chatBoxRoomService.unstarRoom> {
    return chatBoxRoomService.unstarRoom.apply(this, args as any);
  }

  async updateRoomPolicies(
    ...args: Parameters<typeof chatBoxRoomService.updateRoomPolicies>
  ): ReturnType<typeof chatBoxRoomService.updateRoomPolicies> {
    return chatBoxRoomService.updateRoomPolicies.apply(this, args as any);
  }

  async joinPublicRoom(
    ...args: Parameters<typeof chatBoxRoomService.joinPublicRoom>
  ): ReturnType<typeof chatBoxRoomService.joinPublicRoom> {
    return chatBoxRoomService.joinPublicRoom.apply(this, args as any);
  }

  async listInviteCandidates(
    ...args: Parameters<typeof chatBoxRoomService.listInviteCandidates>
  ): ReturnType<typeof chatBoxRoomService.listInviteCandidates> {
    return chatBoxRoomService.listInviteCandidates.apply(this, args as any);
  }

  async inviteMembers(
    ...args: Parameters<typeof chatBoxRoomService.inviteMembers>
  ): ReturnType<typeof chatBoxRoomService.inviteMembers> {
    return chatBoxRoomService.inviteMembers.apply(this, args as any);
  }

  async acceptInvitation(
    ...args: Parameters<typeof chatBoxRoomService.acceptInvitation>
  ): ReturnType<typeof chatBoxRoomService.acceptInvitation> {
    return chatBoxRoomService.acceptInvitation.apply(this, args as any);
  }

  async updateMemberRole(
    ...args: Parameters<typeof chatBoxRoomService.updateMemberRole>
  ): ReturnType<typeof chatBoxRoomService.updateMemberRole> {
    return chatBoxRoomService.updateMemberRole.apply(this, args as any);
  }

  async transferRoomOwnership(
    ...args: Parameters<typeof chatBoxRoomService.transferRoomOwnership>
  ): ReturnType<typeof chatBoxRoomService.transferRoomOwnership> {
    return chatBoxRoomService.transferRoomOwnership.apply(this, args as any);
  }

  async removeMember(
    ...args: Parameters<typeof chatBoxRoomService.removeMember>
  ): ReturnType<typeof chatBoxRoomService.removeMember> {
    return chatBoxRoomService.removeMember.apply(this, args as any);
  }

  async sendMessage(
    ...args: Parameters<typeof chatBoxMessageService.sendMessage>
  ): ReturnType<typeof chatBoxMessageService.sendMessage> {
    return chatBoxMessageService.sendMessage.apply(this, args as any);
  }

  async forwardMessage(
    ...args: Parameters<typeof chatBoxMessageService.forwardMessage>
  ): ReturnType<typeof chatBoxMessageService.forwardMessage> {
    return chatBoxMessageService.forwardMessage.apply(this, args as any);
  }

  async updateMessage(
    ...args: Parameters<typeof chatBoxMessageService.updateMessage>
  ): ReturnType<typeof chatBoxMessageService.updateMessage> {
    return chatBoxMessageService.updateMessage.apply(this, args as any);
  }

  async deleteMessage(
    ...args: Parameters<typeof chatBoxMessageService.deleteMessage>
  ): ReturnType<typeof chatBoxMessageService.deleteMessage> {
    return chatBoxMessageService.deleteMessage.apply(this, args as any);
  }

  async uploadMessageAttachment(
    ...args: Parameters<typeof chatBoxMessageService.uploadMessageAttachment>
  ): ReturnType<typeof chatBoxMessageService.uploadMessageAttachment> {
    return chatBoxMessageService.uploadMessageAttachment.apply(
      this,
      args as any,
    );
  }

  async listMessageAttachments(
    ...args: Parameters<typeof chatBoxMessageService.listMessageAttachments>
  ): ReturnType<typeof chatBoxMessageService.listMessageAttachments> {
    return chatBoxMessageService.listMessageAttachments.apply(
      this,
      args as any,
    );
  }

  async removeMessageAttachment(
    ...args: Parameters<typeof chatBoxMessageService.removeMessageAttachment>
  ): ReturnType<typeof chatBoxMessageService.removeMessageAttachment> {
    return chatBoxMessageService.removeMessageAttachment.apply(
      this,
      args as any,
    );
  }

  async requestDirectUploadAuth(
    ...args: Parameters<typeof chatBoxMessageService.requestDirectUploadAuth>
  ): ReturnType<typeof chatBoxMessageService.requestDirectUploadAuth> {
    return chatBoxMessageService.requestDirectUploadAuth.apply(
      this,
      args as any,
    );
  }

  async completeDirectUploadAttachment(
    ...args: Parameters<
      typeof chatBoxMessageService.completeDirectUploadAttachment
    >
  ): ReturnType<typeof chatBoxMessageService.completeDirectUploadAttachment> {
    return chatBoxMessageService.completeDirectUploadAttachment.apply(
      this,
      args as any,
    );
  }

  async searchRoomMessages(
    ...args: Parameters<typeof chatBoxMessageService.searchRoomMessages>
  ): ReturnType<typeof chatBoxMessageService.searchRoomMessages> {
    return this.withPerfLatency('chat.search_room_messages', async () =>
      chatBoxMessageService.searchRoomMessages.apply(this, args as any),
    ) as ReturnType<typeof chatBoxMessageService.searchRoomMessages>;
  }

  async searchGlobalSuggest(
    ...args: Parameters<typeof chatBoxMessageService.searchGlobalSuggest>
  ): ReturnType<typeof chatBoxMessageService.searchGlobalSuggest> {
    return this.withPerfLatency('chat.search_global_suggest', async () =>
      chatBoxMessageService.searchGlobalSuggest.apply(this, args as any),
    ) as ReturnType<typeof chatBoxMessageService.searchGlobalSuggest>;
  }

  async searchGlobalResults(
    ...args: Parameters<typeof chatBoxMessageService.searchGlobalResults>
  ): ReturnType<typeof chatBoxMessageService.searchGlobalResults> {
    return this.withPerfLatency('chat.search_global_results', async () =>
      chatBoxMessageService.searchGlobalResults.apply(this, args as any),
    ) as ReturnType<typeof chatBoxMessageService.searchGlobalResults>;
  }

  async listRoomAttachments(
    ...args: Parameters<typeof chatBoxMessageService.listRoomAttachments>
  ): ReturnType<typeof chatBoxMessageService.listRoomAttachments> {
    return chatBoxMessageService.listRoomAttachments.apply(this, args as any);
  }

  async listRoomMessages(
    ...args: Parameters<typeof chatBoxMessageService.listRoomMessages>
  ): ReturnType<typeof chatBoxMessageService.listRoomMessages> {
    return this.withPerfLatency('chat.list_room_messages', async () =>
      chatBoxMessageService.listRoomMessages.apply(this, args as any),
    ) as ReturnType<typeof chatBoxMessageService.listRoomMessages>;
  }

  async getMessageLinkPreview(
    ...args: Parameters<typeof chatBoxMessageService.getMessageLinkPreview>
  ): ReturnType<typeof chatBoxMessageService.getMessageLinkPreview> {
    return chatBoxMessageService.getMessageLinkPreview.apply(this, args as any);
  }

  async getRoomMessageContext(
    ...args: Parameters<typeof chatBoxMessageService.getRoomMessageContext>
  ): ReturnType<typeof chatBoxMessageService.getRoomMessageContext> {
    return chatBoxMessageService.getRoomMessageContext.apply(this, args as any);
  }

  async listRoomMessagesByCursor(
    ...args: Parameters<typeof chatBoxMessageService.listRoomMessagesByCursor>
  ): ReturnType<typeof chatBoxMessageService.listRoomMessagesByCursor> {
    return this.withPerfLatency('chat.list_room_messages_cursor', async () =>
      chatBoxMessageService.listRoomMessagesByCursor.apply(this, args as any),
    ) as ReturnType<typeof chatBoxMessageService.listRoomMessagesByCursor>;
  }

  async updateMyReadState(
    ...args: Parameters<typeof chatBoxMessageService.updateMyReadState>
  ): ReturnType<typeof chatBoxMessageService.updateMyReadState> {
    return chatBoxMessageService.updateMyReadState.apply(this, args as any);
  }

  async listMyUnreadCounts(
    ...args: Parameters<typeof chatBoxMessageService.listMyUnreadCounts>
  ): ReturnType<typeof chatBoxMessageService.listMyUnreadCounts> {
    return this.withPerfLatency('chat.list_my_unread_counts', async () =>
      chatBoxMessageService.listMyUnreadCounts.apply(this, args as any),
    ) as ReturnType<typeof chatBoxMessageService.listMyUnreadCounts>;
  }

  async addMessageReaction(
    ...args: Parameters<typeof chatBoxMessageService.addMessageReaction>
  ): ReturnType<typeof chatBoxMessageService.addMessageReaction> {
    return chatBoxMessageService.addMessageReaction.apply(this, args as any);
  }

  async updateMyRoomNotifySettings(
    ...args: Parameters<typeof chatBoxMessageService.updateMyRoomNotifySettings>
  ): ReturnType<typeof chatBoxMessageService.updateMyRoomNotifySettings> {
    return chatBoxMessageService.updateMyRoomNotifySettings.apply(
      this,
      args as any,
    );
  }

  async updateMyRoomVisibility(
    ...args: Parameters<typeof chatBoxMessageService.updateMyRoomVisibility>
  ): ReturnType<typeof chatBoxMessageService.updateMyRoomVisibility> {
    return chatBoxMessageService.updateMyRoomVisibility.apply(
      this,
      args as any,
    );
  }

  async removeMessageReaction(
    ...args: Parameters<typeof chatBoxMessageService.removeMessageReaction>
  ): ReturnType<typeof chatBoxMessageService.removeMessageReaction> {
    return chatBoxMessageService.removeMessageReaction.apply(this, args as any);
  }

  async listMessageReactions(
    ...args: Parameters<typeof chatBoxMessageService.listMessageReactions>
  ): ReturnType<typeof chatBoxMessageService.listMessageReactions> {
    return chatBoxMessageService.listMessageReactions.apply(this, args as any);
  }

  async listMessageReactionsByMessageIds(
    ...args: Parameters<
      typeof chatBoxMessageService.listMessageReactionsByMessageIds
    >
  ): ReturnType<typeof chatBoxMessageService.listMessageReactionsByMessageIds> {
    return chatBoxMessageService.listMessageReactionsByMessageIds.apply(
      this,
      args as any,
    );
  }

  async listMyMentions(
    ...args: Parameters<typeof chatBoxMessageService.listMyMentions>
  ): ReturnType<typeof chatBoxMessageService.listMyMentions> {
    return chatBoxMessageService.listMyMentions.apply(this, args as any);
  }

  async markMentionAsRead(
    ...args: Parameters<typeof chatBoxMessageService.markMentionAsRead>
  ): ReturnType<typeof chatBoxMessageService.markMentionAsRead> {
    return chatBoxMessageService.markMentionAsRead.apply(this, args as any);
  }

  async markMyMentionsAsRead(
    ...args: Parameters<typeof chatBoxMessageService.markMyMentionsAsRead>
  ): ReturnType<typeof chatBoxMessageService.markMyMentionsAsRead> {
    return chatBoxMessageService.markMyMentionsAsRead.apply(this, args as any);
  }

  async markPersonalInboxRoomAsRead(
    ...args: Parameters<typeof chatBoxMessageService.markPersonalInboxRoomAsRead>
  ): ReturnType<typeof chatBoxMessageService.markPersonalInboxRoomAsRead> {
    return chatBoxMessageService.markPersonalInboxRoomAsRead.apply(
      this,
      args as any,
    );
  }

  async pinMessage(
    ...args: Parameters<typeof chatBoxMessageService.pinMessage>
  ): ReturnType<typeof chatBoxMessageService.pinMessage> {
    return chatBoxMessageService.pinMessage.apply(this, args as any);
  }

  async unpinMessage(
    ...args: Parameters<typeof chatBoxMessageService.unpinMessage>
  ): ReturnType<typeof chatBoxMessageService.unpinMessage> {
    return chatBoxMessageService.unpinMessage.apply(this, args as any);
  }

  async listPinnedMessages(
    ...args: Parameters<typeof chatBoxMessageService.listPinnedMessages>
  ): ReturnType<typeof chatBoxMessageService.listPinnedMessages> {
    return chatBoxMessageService.listPinnedMessages.apply(this, args as any);
  }

  async upsertCurrentDraft(
    ...args: Parameters<typeof chatBoxMessageService.upsertCurrentDraft>
  ): ReturnType<typeof chatBoxMessageService.upsertCurrentDraft> {
    return chatBoxMessageService.upsertCurrentDraft.apply(this, args as any);
  }

  async getCurrentDraft(
    ...args: Parameters<typeof chatBoxMessageService.getCurrentDraft>
  ): ReturnType<typeof chatBoxMessageService.getCurrentDraft> {
    return chatBoxMessageService.getCurrentDraft.apply(this, args as any);
  }

  async listMyDrafts(
    ...args: Parameters<typeof chatBoxMessageService.listMyDrafts>
  ): ReturnType<typeof chatBoxMessageService.listMyDrafts> {
    return chatBoxMessageService.listMyDrafts.apply(this, args as any);
  }

  async deleteDraft(
    ...args: Parameters<typeof chatBoxMessageService.deleteDraft>
  ): ReturnType<typeof chatBoxMessageService.deleteDraft> {
    return chatBoxMessageService.deleteDraft.apply(this, args as any);
  }

  async createScheduledMessage(
    ...args: Parameters<typeof chatBoxMessageService.createScheduledMessage>
  ): ReturnType<typeof chatBoxMessageService.createScheduledMessage> {
    return chatBoxMessageService.createScheduledMessage.apply(
      this,
      args as any,
    );
  }

  async listMyScheduledMessages(
    ...args: Parameters<typeof chatBoxMessageService.listMyScheduledMessages>
  ): ReturnType<typeof chatBoxMessageService.listMyScheduledMessages> {
    return chatBoxMessageService.listMyScheduledMessages.apply(
      this,
      args as any,
    );
  }

  async updateScheduledMessage(
    ...args: Parameters<typeof chatBoxMessageService.updateScheduledMessage>
  ): ReturnType<typeof chatBoxMessageService.updateScheduledMessage> {
    return chatBoxMessageService.updateScheduledMessage.apply(
      this,
      args as any,
    );
  }

  async cancelScheduledMessageToDraft(
    ...args: Parameters<
      typeof chatBoxMessageService.cancelScheduledMessageToDraft
    >
  ): ReturnType<typeof chatBoxMessageService.cancelScheduledMessageToDraft> {
    return chatBoxMessageService.cancelScheduledMessageToDraft.apply(
      this,
      args as any,
    );
  }

  async sendScheduledMessageNow(
    ...args: Parameters<typeof chatBoxMessageService.sendScheduledMessageNow>
  ): ReturnType<typeof chatBoxMessageService.sendScheduledMessageNow> {
    return chatBoxMessageService.sendScheduledMessageNow.apply(
      this,
      args as any,
    );
  }

  async deleteScheduledMessage(
    ...args: Parameters<typeof chatBoxMessageService.deleteScheduledMessage>
  ): ReturnType<typeof chatBoxMessageService.deleteScheduledMessage> {
    return chatBoxMessageService.deleteScheduledMessage.apply(
      this,
      args as any,
    );
  }

  async updateMyPresence(
    ...args: Parameters<typeof chatBoxPresenceService.updateMyPresence>
  ): ReturnType<typeof chatBoxPresenceService.updateMyPresence> {
    return chatBoxPresenceService.updateMyPresence.apply(this, args as any);
  }

  async listOrganizationPresence(
    ...args: Parameters<typeof chatBoxPresenceService.listOrganizationPresence>
  ): ReturnType<typeof chatBoxPresenceService.listOrganizationPresence> {
    return chatBoxPresenceService.listOrganizationPresence.apply(
      this,
      args as any,
    );
  }

  async handleSocketConnected(
    ...args: Parameters<typeof chatBoxPresenceService.handleSocketConnected>
  ): ReturnType<typeof chatBoxPresenceService.handleSocketConnected> {
    return chatBoxPresenceService.handleSocketConnected.apply(
      this,
      args as any,
    );
  }

  async handleSocketDisconnected(
    ...args: Parameters<typeof chatBoxPresenceService.handleSocketDisconnected>
  ): ReturnType<typeof chatBoxPresenceService.handleSocketDisconnected> {
    return chatBoxPresenceService.handleSocketDisconnected.apply(
      this,
      args as any,
    );
  }

  private async getRoomAccessForCaller(
    ...args: Parameters<typeof chatBoxRoomService.getRoomAccessForCaller>
  ): ReturnType<typeof chatBoxRoomService.getRoomAccessForCaller> {
    return chatBoxRoomService.getRoomAccessForCaller.apply(this, args as any);
  }

  private extractMentionedUserIds(
    ...args: Parameters<typeof chatBoxMessageService.extractMentionedUserIds>
  ): ReturnType<typeof chatBoxMessageService.extractMentionedUserIds> {
    return chatBoxMessageService.extractMentionedUserIds.apply(
      this,
      args as any,
    );
  }

  private extractSpecialMentionTypes(
    ...args: Parameters<typeof chatBoxMessageService.extractSpecialMentionTypes>
  ): ReturnType<typeof chatBoxMessageService.extractSpecialMentionTypes> {
    return chatBoxMessageService.extractSpecialMentionTypes.apply(
      this,
      args as any,
    );
  }

  private validateSpecialMentionTypesForRoom(
    ...args: Parameters<
      typeof chatBoxMessageService.validateSpecialMentionTypesForRoom
    >
  ): ReturnType<typeof chatBoxMessageService.validateSpecialMentionTypesForRoom> {
    return chatBoxMessageService.validateSpecialMentionTypesForRoom.apply(
      this,
      args as any,
    );
  }

  private shouldSkipMentionForNotifyLevel(
    ...args: Parameters<
      typeof chatBoxMessageService.shouldSkipMentionForNotifyLevel
    >
  ): ReturnType<typeof chatBoxMessageService.shouldSkipMentionForNotifyLevel> {
    return chatBoxMessageService.shouldSkipMentionForNotifyLevel.apply(
      this,
      args as any,
    );
  }

  private withCanonicalMentionMetadata(
    ...args: Parameters<typeof chatBoxMessageService.withCanonicalMentionMetadata>
  ): ReturnType<typeof chatBoxMessageService.withCanonicalMentionMetadata> {
    return chatBoxMessageService.withCanonicalMentionMetadata.apply(
      this,
      args as any,
    );
  }

  private async updatePresenceFromSocketLifecycle(
    ...args: Parameters<
      typeof chatBoxPresenceService.updatePresenceFromSocketLifecycle
    >
  ): ReturnType<
    typeof chatBoxPresenceService.updatePresenceFromSocketLifecycle
  > {
    return chatBoxPresenceService.updatePresenceFromSocketLifecycle.apply(
      this,
      args as any,
    );
  }

  private async getActiveOrganizationIdsByUser(
    ...args: Parameters<
      typeof chatBoxPresenceService.getActiveOrganizationIdsByUser
    >
  ): ReturnType<typeof chatBoxPresenceService.getActiveOrganizationIdsByUser> {
    return chatBoxPresenceService.getActiveOrganizationIdsByUser.apply(
      this,
      args as any,
    );
  }

  private buildRoomPermissions(
    ...args: Parameters<typeof chatBoxRoomService.buildRoomPermissions>
  ): ReturnType<typeof chatBoxRoomService.buildRoomPermissions> {
    return chatBoxRoomService.buildRoomPermissions.apply(this, args as any);
  }

  private buildDefaultRoomPolicies(
    ...args: Parameters<typeof chatBoxRoomService.buildDefaultRoomPolicies>
  ): ReturnType<typeof chatBoxRoomService.buildDefaultRoomPolicies> {
    return chatBoxRoomService.buildDefaultRoomPolicies.apply(this, args as any);
  }

  private async getUnreadCountForRoom(
    ...args: Parameters<typeof chatBoxMessageService.getUnreadCountForRoom>
  ): ReturnType<typeof chatBoxMessageService.getUnreadCountForRoom> {
    return chatBoxMessageService.getUnreadCountForRoom.apply(this, args as any);
  }

  private async markMentionsAsReadByReadState(
    ...args: Parameters<
      typeof chatBoxMessageService.markMentionsAsReadByReadState
    >
  ): ReturnType<typeof chatBoxMessageService.markMentionsAsReadByReadState> {
    return chatBoxMessageService.markMentionsAsReadByReadState.apply(
      this,
      args as any,
    );
  }

  private async assertActiveOrgMember(
    ...args: Parameters<typeof chatBoxRoomService.assertActiveOrgMember>
  ): ReturnType<typeof chatBoxRoomService.assertActiveOrgMember> {
    return chatBoxRoomService.assertActiveOrgMember.apply(this, args as any);
  }

  private async ensureUsersAreActiveOrgMembers(
    ...args: Parameters<
      typeof chatBoxRoomService.ensureUsersAreActiveOrgMembers
    >
  ): ReturnType<typeof chatBoxRoomService.ensureUsersAreActiveOrgMembers> {
    return chatBoxRoomService.ensureUsersAreActiveOrgMembers.apply(
      this,
      args as any,
    );
  }

  private buildRequestedRoomKey(
    ...args: Parameters<typeof chatBoxRoomService.buildRequestedRoomKey>
  ): ReturnType<typeof chatBoxRoomService.buildRequestedRoomKey> {
    return chatBoxRoomService.buildRequestedRoomKey.apply(this, args as any);
  }

  private normalizeRoomKey(
    ...args: Parameters<typeof chatBoxRoomService.normalizeRoomKey>
  ): ReturnType<typeof chatBoxRoomService.normalizeRoomKey> {
    return chatBoxRoomService.normalizeRoomKey.apply(this, args as any);
  }

  private async resolveUniqueRoomKey(
    ...args: Parameters<typeof chatBoxRoomService.resolveUniqueRoomKey>
  ): ReturnType<typeof chatBoxRoomService.resolveUniqueRoomKey> {
    return chatBoxRoomService.resolveUniqueRoomKey.apply(this, args as any);
  }

  private async ensureDmMemberships(
    ...args: Parameters<typeof chatBoxRoomService.ensureDmMemberships>
  ): ReturnType<typeof chatBoxRoomService.ensureDmMemberships> {
    return chatBoxRoomService.ensureDmMemberships.apply(this, args as any);
  }

  private buildForwardClientMessageId(
    ...args: Parameters<
      typeof chatBoxMessageService.buildForwardClientMessageId
    >
  ): ReturnType<typeof chatBoxMessageService.buildForwardClientMessageId> {
    return chatBoxMessageService.buildForwardClientMessageId.apply(
      this,
      args as any,
    );
  }

  private resolveErrorMessage(
    ...args: Parameters<typeof chatBoxMessageService.resolveErrorMessage>
  ): ReturnType<typeof chatBoxMessageService.resolveErrorMessage> {
    return chatBoxMessageService.resolveErrorMessage.apply(this, args as any);
  }

  private resolveForwardMessageType(
    ...args: Parameters<typeof chatBoxMessageService.resolveForwardMessageType>
  ): ReturnType<typeof chatBoxMessageService.resolveForwardMessageType> {
    return chatBoxMessageService.resolveForwardMessageType.apply(
      this,
      args as any,
    );
  }

  private async cloneAttachmentsForForward(
    ...args: Parameters<typeof chatBoxMessageService.cloneAttachmentsForForward>
  ): ReturnType<typeof chatBoxMessageService.cloneAttachmentsForForward> {
    return chatBoxMessageService.cloneAttachmentsForForward.apply(
      this,
      args as any,
    );
  }

  private toForwardedAttachmentSnapshot(
    ...args: Parameters<
      typeof chatBoxMessageService.toForwardedAttachmentSnapshot
    >
  ): ReturnType<typeof chatBoxMessageService.toForwardedAttachmentSnapshot> {
    return chatBoxMessageService.toForwardedAttachmentSnapshot.apply(
      this,
      args as any,
    );
  }

  private buildRoomMessageQuery(
    ...args: Parameters<typeof chatBoxMessageService.buildRoomMessageQuery>
  ): ReturnType<typeof chatBoxMessageService.buildRoomMessageQuery> {
    return chatBoxMessageService.buildRoomMessageQuery.apply(this, args as any);
  }

  private async getRoomMessageById(
    ...args: Parameters<typeof chatBoxMessageService.getRoomMessageById>
  ): ReturnType<typeof chatBoxMessageService.getRoomMessageById> {
    return chatBoxMessageService.getRoomMessageById.apply(this, args as any);
  }

  private toRoomMessageResponseFromRawRow(
    ...args: Parameters<
      typeof chatBoxMessageService.toRoomMessageResponseFromRawRow
    >
  ): ReturnType<typeof chatBoxMessageService.toRoomMessageResponseFromRawRow> {
    return chatBoxMessageService.toRoomMessageResponseFromRawRow.apply(
      this,
      args as any,
    );
  }

  private toReplyPreviewFromRawRow(
    ...args: Parameters<typeof chatBoxMessageService.toReplyPreviewFromRawRow>
  ): ReturnType<typeof chatBoxMessageService.toReplyPreviewFromRawRow> {
    return chatBoxMessageService.toReplyPreviewFromRawRow.apply(
      this,
      args as any,
    );
  }

  private extractForwardedSnapshot(
    ...args: Parameters<typeof chatBoxMessageService.extractForwardedSnapshot>
  ): ReturnType<typeof chatBoxMessageService.extractForwardedSnapshot> {
    return chatBoxMessageService.extractForwardedSnapshot.apply(
      this,
      args as any,
    );
  }

  private buildSearchSnippet(
    ...args: Parameters<typeof chatBoxMessageService.buildSearchSnippet>
  ): ReturnType<typeof chatBoxMessageService.buildSearchSnippet> {
    return chatBoxMessageService.buildSearchSnippet.apply(this, args as any);
  }

  private async buildMessageReactionSummaries(
    ...args: Parameters<
      typeof chatBoxMessageService.buildMessageReactionSummaries
    >
  ): ReturnType<typeof chatBoxMessageService.buildMessageReactionSummaries> {
    return chatBoxMessageService.buildMessageReactionSummaries.apply(
      this,
      args as any,
    );
  }

  private async buildMessageReactionSummariesByMessageIds(
    ...args: Parameters<
      typeof chatBoxMessageService.buildMessageReactionSummariesByMessageIds
    >
  ): ReturnType<
    typeof chatBoxMessageService.buildMessageReactionSummariesByMessageIds
  > {
    return chatBoxMessageService.buildMessageReactionSummariesByMessageIds.apply(
      this,
      args as any,
    );
  }

  private pickReactionSummary(
    ...args: Parameters<typeof chatBoxMessageService.pickReactionSummary>
  ): ReturnType<typeof chatBoxMessageService.pickReactionSummary> {
    return chatBoxMessageService.pickReactionSummary.apply(this, args as any);
  }

  private buildUserDisplayName(
    ...args: Parameters<typeof chatBoxRoomService.buildUserDisplayName>
  ): ReturnType<typeof chatBoxRoomService.buildUserDisplayName> {
    return chatBoxRoomService.buildUserDisplayName.apply(this, args as any);
  }

  private async resolveArchivedByDisplayName(
    ...args: Parameters<typeof chatBoxRoomService.resolveArchivedByDisplayName>
  ): ReturnType<typeof chatBoxRoomService.resolveArchivedByDisplayName> {
    return chatBoxRoomService.resolveArchivedByDisplayName.apply(
      this,
      args as any,
    );
  }

  private normalizeRoomTabs(
    ...args: Parameters<typeof chatBoxRoomService.normalizeRoomTabs>
  ): ReturnType<typeof chatBoxRoomService.normalizeRoomTabs> {
    return chatBoxRoomService.normalizeRoomTabs.apply(this, args as any);
  }

  private validateRoomTabs(
    ...args: Parameters<typeof chatBoxRoomService.validateRoomTabs>
  ): ReturnType<typeof chatBoxRoomService.validateRoomTabs> {
    return chatBoxRoomService.validateRoomTabs.apply(this, args as any);
  }

  private toRoomSummary(
    ...args: Parameters<typeof chatBoxRoomService.toRoomSummary>
  ): ReturnType<typeof chatBoxRoomService.toRoomSummary> {
    return chatBoxRoomService.toRoomSummary.apply(this, args as any);
  }

  private toRoomMemberResponse(
    ...args: Parameters<typeof chatBoxRoomService.toRoomMemberResponse>
  ): ReturnType<typeof chatBoxRoomService.toRoomMemberResponse> {
    return chatBoxRoomService.toRoomMemberResponse.apply(this, args as any);
  }

  private toRoomInvitationResponse(
    ...args: Parameters<typeof chatBoxRoomService.toRoomInvitationResponse>
  ): ReturnType<typeof chatBoxRoomService.toRoomInvitationResponse> {
    return chatBoxRoomService.toRoomInvitationResponse.apply(this, args as any);
  }

  private async getCacheVersionNumber(
    ...args: Parameters<typeof chatBoxRoomService.getCacheVersionNumber>
  ): ReturnType<typeof chatBoxRoomService.getCacheVersionNumber> {
    return chatBoxRoomService.getCacheVersionNumber.apply(this, args as any);
  }

  private async bumpCacheVersionNumber(
    ...args: Parameters<typeof chatBoxRoomService.bumpCacheVersionNumber>
  ): ReturnType<typeof chatBoxRoomService.bumpCacheVersionNumber> {
    return chatBoxRoomService.bumpCacheVersionNumber.apply(this, args as any);
  }

  private async bumpUserRoomsStateVersions(
    ...args: Parameters<typeof chatBoxRoomService.bumpUserRoomsStateVersions>
  ): ReturnType<typeof chatBoxRoomService.bumpUserRoomsStateVersions> {
    return chatBoxRoomService.bumpUserRoomsStateVersions.apply(
      this,
      args as any,
    );
  }

  private async bumpRoomMemberRoomsStateVersions(
    ...args: Parameters<typeof chatBoxRoomService.bumpRoomMemberRoomsStateVersions>
  ): ReturnType<typeof chatBoxRoomService.bumpRoomMemberRoomsStateVersions> {
    return chatBoxRoomService.bumpRoomMemberRoomsStateVersions.apply(
      this,
      args as any,
    );
  }

  private toRoomMessageResponse(
    ...args: Parameters<typeof chatBoxMessageService.toRoomMessageResponse>
  ): ReturnType<typeof chatBoxMessageService.toRoomMessageResponse> {
    return chatBoxMessageService.toRoomMessageResponse.apply(this, args as any);
  }

  private toMessageAttachmentResponse(
    ...args: Parameters<
      typeof chatBoxMessageService.toMessageAttachmentResponse
    >
  ): ReturnType<typeof chatBoxMessageService.toMessageAttachmentResponse> {
    return chatBoxMessageService.toMessageAttachmentResponse.apply(
      this,
      args as any,
    );
  }

  private emitAttachmentPreviewUpdatedEvent(
    ...args: Parameters<
      typeof chatBoxMessageService.emitAttachmentPreviewUpdatedEvent
    >
  ): ReturnType<
    typeof chatBoxMessageService.emitAttachmentPreviewUpdatedEvent
  > {
    return chatBoxMessageService.emitAttachmentPreviewUpdatedEvent.apply(
      this,
      args as any,
    );
  }

  private async buildLinkPreviewPlan(
    ...args: Parameters<typeof chatBoxMessageService.buildLinkPreviewPlan>
  ): ReturnType<typeof chatBoxMessageService.buildLinkPreviewPlan> {
    return chatBoxMessageService.buildLinkPreviewPlan.apply(this, args as any);
  }

  private normalizeMessageMetadata(
    ...args: Parameters<typeof chatBoxMessageService.normalizeMessageMetadata>
  ): ReturnType<typeof chatBoxMessageService.normalizeMessageMetadata> {
    return chatBoxMessageService.normalizeMessageMetadata.apply(
      this,
      args as any,
    );
  }

  private computeLinkPreviewStatus(
    ...args: Parameters<typeof chatBoxMessageService.computeLinkPreviewStatus>
  ): ReturnType<typeof chatBoxMessageService.computeLinkPreviewStatus> {
    return chatBoxMessageService.computeLinkPreviewStatus.apply(
      this,
      args as any,
    );
  }

  private async enrichRoomMessages(
    ...args: Parameters<typeof chatBoxMessageService.enrichRoomMessages>
  ): ReturnType<typeof chatBoxMessageService.enrichRoomMessages> {
    return chatBoxMessageService.enrichRoomMessages.apply(this, args as any);
  }

  private extractLinkPreviewsFromMetadata(
    ...args: Parameters<
      typeof chatBoxMessageService.extractLinkPreviewsFromMetadata
    >
  ): ReturnType<typeof chatBoxMessageService.extractLinkPreviewsFromMetadata> {
    return chatBoxMessageService.extractLinkPreviewsFromMetadata.apply(
      this,
      args as any,
    );
  }

  private buildAttachmentPreview(
    ...args: Parameters<typeof chatBoxMessageService.buildAttachmentPreview>
  ): ReturnType<typeof chatBoxMessageService.buildAttachmentPreview> {
    return chatBoxMessageService.buildAttachmentPreview.apply(
      this,
      args as any,
    );
  }

  private buildLegacyAttachmentPreview(
    ...args: Parameters<
      typeof chatBoxMessageService.buildLegacyAttachmentPreview
    >
  ): ReturnType<typeof chatBoxMessageService.buildLegacyAttachmentPreview> {
    return chatBoxMessageService.buildLegacyAttachmentPreview.apply(
      this,
      args as any,
    );
  }

  private buildAttachmentPreviewSeed(
    ...args: Parameters<typeof chatBoxMessageService.buildAttachmentPreviewSeed>
  ): ReturnType<typeof chatBoxMessageService.buildAttachmentPreviewSeed> {
    return chatBoxMessageService.buildAttachmentPreviewSeed.apply(
      this,
      args as any,
    );
  }

  private hasPersistedAttachmentPreview(
    ...args: Parameters<
      typeof chatBoxMessageService.hasPersistedAttachmentPreview
    >
  ): ReturnType<typeof chatBoxMessageService.hasPersistedAttachmentPreview> {
    return chatBoxMessageService.hasPersistedAttachmentPreview.apply(
      this,
      args as any,
    );
  }

  private isOfficeFileExtension(
    ...args: Parameters<typeof chatBoxMessageService.isOfficeFileExtension>
  ): ReturnType<typeof chatBoxMessageService.isOfficeFileExtension> {
    return chatBoxMessageService.isOfficeFileExtension.apply(this, args as any);
  }

  private isTextPreviewFile(
    ...args: Parameters<typeof chatBoxMessageService.isTextPreviewFile>
  ): ReturnType<typeof chatBoxMessageService.isTextPreviewFile> {
    return chatBoxMessageService.isTextPreviewFile.apply(this, args as any);
  }

  private supportsRenderedAttachmentPreview(
    ...args: Parameters<
      typeof chatBoxMessageService.supportsRenderedAttachmentPreview
    >
  ): ReturnType<
    typeof chatBoxMessageService.supportsRenderedAttachmentPreview
  > {
    return chatBoxMessageService.supportsRenderedAttachmentPreview.apply(
      this,
      args as any,
    );
  }

  private coerceAttachmentFileSizeBytes(
    ...args: Parameters<
      typeof chatBoxMessageService.coerceAttachmentFileSizeBytes
    >
  ): ReturnType<typeof chatBoxMessageService.coerceAttachmentFileSizeBytes> {
    return chatBoxMessageService.coerceAttachmentFileSizeBytes.apply(
      this,
      args as any,
    );
  }

  private shouldSkipAttachmentPreviewForLargeFile(
    ...args: Parameters<
      typeof chatBoxMessageService.shouldSkipAttachmentPreviewForLargeFile
    >
  ): ReturnType<
    typeof chatBoxMessageService.shouldSkipAttachmentPreviewForLargeFile
  > {
    return chatBoxMessageService.shouldSkipAttachmentPreviewForLargeFile.apply(
      this,
      args as any,
    );
  }

  private toDateOrUndefined(
    ...args: Parameters<typeof chatBoxMessageService.toDateOrUndefined>
  ): ReturnType<typeof chatBoxMessageService.toDateOrUndefined> {
    return chatBoxMessageService.toDateOrUndefined.apply(this, args as any);
  }

  private resolveAttachmentDocumentType(
    ...args: Parameters<
      typeof chatBoxMessageService.resolveAttachmentDocumentType
    >
  ): ReturnType<typeof chatBoxMessageService.resolveAttachmentDocumentType> {
    return chatBoxMessageService.resolveAttachmentDocumentType.apply(
      this,
      args as any,
    );
  }

  private buildOfficeEmbedPreviewUrl(
    ...args: Parameters<typeof chatBoxMessageService.buildOfficeEmbedPreviewUrl>
  ): ReturnType<typeof chatBoxMessageService.buildOfficeEmbedPreviewUrl> {
    return chatBoxMessageService.buildOfficeEmbedPreviewUrl.apply(
      this,
      args as any,
    );
  }

  private buildAttachmentThumbnailVariants(
    ...args: Parameters<
      typeof chatBoxMessageService.buildAttachmentThumbnailVariants
    >
  ): ReturnType<typeof chatBoxMessageService.buildAttachmentThumbnailVariants> {
    return chatBoxMessageService.buildAttachmentThumbnailVariants.apply(
      this,
      args as any,
    );
  }

  private buildAttachmentPreviewVersion(
    ...args: Parameters<
      typeof chatBoxMessageService.buildAttachmentPreviewVersion
    >
  ): ReturnType<typeof chatBoxMessageService.buildAttachmentPreviewVersion> {
    return chatBoxMessageService.buildAttachmentPreviewVersion.apply(
      this,
      args as any,
    );
  }

  private resolveAttachmentPreviewAssetSource(
    ...args: Parameters<
      typeof chatBoxMessageService.resolveAttachmentPreviewAssetSource
    >
  ): ReturnType<
    typeof chatBoxMessageService.resolveAttachmentPreviewAssetSource
  > {
    return chatBoxMessageService.resolveAttachmentPreviewAssetSource.apply(
      this,
      args as any,
    );
  }

  private isHttpUrl(
    ...args: Parameters<typeof chatBoxMessageService.isHttpUrl>
  ): ReturnType<typeof chatBoxMessageService.isHttpUrl> {
    return chatBoxMessageService.isHttpUrl.apply(this, args as any);
  }

  private tryBuildImageKitTransformationUrl(
    ...args: Parameters<
      typeof chatBoxMessageService.tryBuildImageKitTransformationUrl
    >
  ): ReturnType<
    typeof chatBoxMessageService.tryBuildImageKitTransformationUrl
  > {
    return chatBoxMessageService.tryBuildImageKitTransformationUrl.apply(
      this,
      args as any,
    );
  }

  private getFileExtension(
    ...args: Parameters<typeof chatBoxMessageService.getFileExtension>
  ): ReturnType<typeof chatBoxMessageService.getFileExtension> {
    return chatBoxMessageService.getFileExtension.apply(this, args as any);
  }

  private enqueueAttachmentPreviewJob(
    ...args: Parameters<
      typeof chatBoxMessageService.enqueueAttachmentPreviewJob
    >
  ): ReturnType<typeof chatBoxMessageService.enqueueAttachmentPreviewJob> {
    return chatBoxMessageService.enqueueAttachmentPreviewJob.apply(
      this,
      args as any,
    );
  }

  private async processAttachmentPreviewQueue(
    ...args: Parameters<
      typeof chatBoxMessageService.processAttachmentPreviewQueue
    >
  ): ReturnType<typeof chatBoxMessageService.processAttachmentPreviewQueue> {
    return chatBoxMessageService.processAttachmentPreviewQueue.apply(
      this,
      args as any,
    );
  }

  private async processScheduledMessageQueue(
    ...args: Parameters<
      typeof chatBoxMessageService.processScheduledMessageQueue
    >
  ): ReturnType<typeof chatBoxMessageService.processScheduledMessageQueue> {
    return chatBoxMessageService.processScheduledMessageQueue.apply(
      this,
      args as any,
    );
  }

  private async processSingleAttachmentPreviewJob(
    ...args: Parameters<
      typeof chatBoxMessageService.processSingleAttachmentPreviewJob
    >
  ): ReturnType<
    typeof chatBoxMessageService.processSingleAttachmentPreviewJob
  > {
    return chatBoxMessageService.processSingleAttachmentPreviewJob.apply(
      this,
      args as any,
    );
  }

  private supportsAsyncDocumentPreview(
    ...args: Parameters<
      typeof chatBoxMessageService.supportsAsyncDocumentPreview
    >
  ): ReturnType<typeof chatBoxMessageService.supportsAsyncDocumentPreview> {
    return chatBoxMessageService.supportsAsyncDocumentPreview.apply(
      this,
      args as any,
    );
  }

  private buildAttachmentPreviewCacheKey(
    ...args: Parameters<
      typeof chatBoxMessageService.buildAttachmentPreviewCacheKey
    >
  ): ReturnType<typeof chatBoxMessageService.buildAttachmentPreviewCacheKey> {
    return chatBoxMessageService.buildAttachmentPreviewCacheKey.apply(
      this,
      args as any,
    );
  }

  private getCachedAttachmentPreviewResult(
    ...args: Parameters<
      typeof chatBoxMessageService.getCachedAttachmentPreviewResult
    >
  ): ReturnType<typeof chatBoxMessageService.getCachedAttachmentPreviewResult> {
    return chatBoxMessageService.getCachedAttachmentPreviewResult.apply(
      this,
      args as any,
    );
  }

  private setCachedAttachmentPreviewResult(
    ...args: Parameters<
      typeof chatBoxMessageService.setCachedAttachmentPreviewResult
    >
  ): ReturnType<typeof chatBoxMessageService.setCachedAttachmentPreviewResult> {
    return chatBoxMessageService.setCachedAttachmentPreviewResult.apply(
      this,
      args as any,
    );
  }

  private cleanupAttachmentPreviewResultCache(
    ...args: Parameters<
      typeof chatBoxMessageService.cleanupAttachmentPreviewResultCache
    >
  ): ReturnType<
    typeof chatBoxMessageService.cleanupAttachmentPreviewResultCache
  > {
    return chatBoxMessageService.cleanupAttachmentPreviewResultCache.apply(
      this,
      args as any,
    );
  }

  private async applyAttachmentPreviewResult(
    ...args: Parameters<
      typeof chatBoxMessageService.applyAttachmentPreviewResult
    >
  ): ReturnType<typeof chatBoxMessageService.applyAttachmentPreviewResult> {
    return chatBoxMessageService.applyAttachmentPreviewResult.apply(
      this,
      args as any,
    );
  }

  private async markAttachmentPreviewFailed(
    ...args: Parameters<
      typeof chatBoxMessageService.markAttachmentPreviewFailed
    >
  ): ReturnType<typeof chatBoxMessageService.markAttachmentPreviewFailed> {
    return chatBoxMessageService.markAttachmentPreviewFailed.apply(
      this,
      args as any,
    );
  }

  private async resolveAsyncDocumentAttachmentPreview(
    ...args: Parameters<
      typeof chatBoxMessageService.resolveAsyncDocumentAttachmentPreview
    >
  ): ReturnType<
    typeof chatBoxMessageService.resolveAsyncDocumentAttachmentPreview
  > {
    return chatBoxMessageService.resolveAsyncDocumentAttachmentPreview.apply(
      this,
      args as any,
    );
  }

  private async tryResolveOfficePreviewFromRenderer(
    ...args: Parameters<
      typeof chatBoxMessageService.tryResolveOfficePreviewFromRenderer
    >
  ): ReturnType<
    typeof chatBoxMessageService.tryResolveOfficePreviewFromRenderer
  > {
    return chatBoxMessageService.tryResolveOfficePreviewFromRenderer.apply(
      this,
      args as any,
    );
  }

  private async tryResolvePdfPreviewAsset(
    ...args: Parameters<typeof chatBoxMessageService.tryResolvePdfPreviewAsset>
  ): ReturnType<typeof chatBoxMessageService.tryResolvePdfPreviewAsset> {
    return chatBoxMessageService.tryResolvePdfPreviewAsset.apply(
      this,
      args as any,
    );
  }

  private toPositiveInteger(
    ...args: Parameters<typeof chatBoxMessageService.toPositiveInteger>
  ): ReturnType<typeof chatBoxMessageService.toPositiveInteger> {
    return chatBoxMessageService.toPositiveInteger.apply(this, args as any);
  }

  private buildGenericDocumentThumbnailDataUrl(
    ...args: Parameters<
      typeof chatBoxMessageService.buildGenericDocumentThumbnailDataUrl
    >
  ): ReturnType<
    typeof chatBoxMessageService.buildGenericDocumentThumbnailDataUrl
  > {
    return chatBoxMessageService.buildGenericDocumentThumbnailDataUrl.apply(
      this,
      args as any,
    );
  }

  private resolveDocumentTypeLabel(
    ...args: Parameters<typeof chatBoxMessageService.resolveDocumentTypeLabel>
  ): ReturnType<typeof chatBoxMessageService.resolveDocumentTypeLabel> {
    return chatBoxMessageService.resolveDocumentTypeLabel.apply(
      this,
      args as any,
    );
  }

  private escapeSvgText(
    ...args: Parameters<typeof chatBoxMessageService.escapeSvgText>
  ): ReturnType<typeof chatBoxMessageService.escapeSvgText> {
    return chatBoxMessageService.escapeSvgText.apply(this, args as any);
  }

  private resolveAttachmentPreviewError(
    ...args: Parameters<
      typeof chatBoxMessageService.resolveAttachmentPreviewError
    >
  ): ReturnType<typeof chatBoxMessageService.resolveAttachmentPreviewError> {
    return chatBoxMessageService.resolveAttachmentPreviewError.apply(
      this,
      args as any,
    );
  }

  private flushAttachmentPreviewMetrics(
    ...args: Parameters<
      typeof chatBoxMessageService.flushAttachmentPreviewMetrics
    >
  ): ReturnType<typeof chatBoxMessageService.flushAttachmentPreviewMetrics> {
    return chatBoxMessageService.flushAttachmentPreviewMetrics.apply(
      this,
      args as any,
    );
  }

  private detectAttachmentTypeByMime(
    ...args: Parameters<typeof chatBoxMessageService.detectAttachmentTypeByMime>
  ): ReturnType<typeof chatBoxMessageService.detectAttachmentTypeByMime> {
    return chatBoxMessageService.detectAttachmentTypeByMime.apply(
      this,
      args as any,
    );
  }

  private detectAttachmentTypeFromFileName(
    ...args: Parameters<
      typeof chatBoxMessageService.detectAttachmentTypeFromFileName
    >
  ): ReturnType<typeof chatBoxMessageService.detectAttachmentTypeFromFileName> {
    return chatBoxMessageService.detectAttachmentTypeFromFileName.apply(
      this,
      args as any,
    );
  }

  private assertAttachmentUploadPolicy(
    ...args: Parameters<
      typeof chatBoxMessageService.assertAttachmentUploadPolicy
    >
  ): ReturnType<typeof chatBoxMessageService.assertAttachmentUploadPolicy> {
    return chatBoxMessageService.assertAttachmentUploadPolicy.apply(
      this,
      args as any,
    );
  }

  private buildUploadIdempotencyKey(
    ...args: Parameters<typeof chatBoxMessageService.buildUploadIdempotencyKey>
  ): ReturnType<typeof chatBoxMessageService.buildUploadIdempotencyKey> {
    return chatBoxMessageService.buildUploadIdempotencyKey.apply(
      this,
      args as any,
    );
  }

  private async findIdempotentAttachment(
    ...args: Parameters<typeof chatBoxMessageService.findIdempotentAttachment>
  ): ReturnType<typeof chatBoxMessageService.findIdempotentAttachment> {
    return chatBoxMessageService.findIdempotentAttachment.apply(
      this,
      args as any,
    );
  }

  private async cacheIdempotentAttachment(
    ...args: Parameters<typeof chatBoxMessageService.cacheIdempotentAttachment>
  ): ReturnType<typeof chatBoxMessageService.cacheIdempotentAttachment> {
    return chatBoxMessageService.cacheIdempotentAttachment.apply(
      this,
      args as any,
    );
  }

  private encodeRoomMessageCursor(
    ...args: Parameters<typeof chatBoxMessageService.encodeRoomMessageCursor>
  ): ReturnType<typeof chatBoxMessageService.encodeRoomMessageCursor> {
    return chatBoxMessageService.encodeRoomMessageCursor.apply(
      this,
      args as any,
    );
  }

  private decodeRoomMessageCursor(
    ...args: Parameters<typeof chatBoxMessageService.decodeRoomMessageCursor>
  ): ReturnType<typeof chatBoxMessageService.decodeRoomMessageCursor> {
    return chatBoxMessageService.decodeRoomMessageCursor.apply(
      this,
      args as any,
    );
  }

  private async applyAutoAwayPresenceRows(
    ...args: Parameters<typeof chatBoxPresenceService.applyAutoAwayPresenceRows>
  ): ReturnType<typeof chatBoxPresenceService.applyAutoAwayPresenceRows> {
    return chatBoxPresenceService.applyAutoAwayPresenceRows.apply(
      this,
      args as any,
    );
  }

  private detectAttachmentType(
    ...args: Parameters<typeof chatBoxMessageService.detectAttachmentType>
  ): ReturnType<typeof chatBoxMessageService.detectAttachmentType> {
    return chatBoxMessageService.detectAttachmentType.apply(this, args as any);
  }

  private toPinnedMessageResponse(
    ...args: Parameters<typeof chatBoxMessageService.toPinnedMessageResponse>
  ): ReturnType<typeof chatBoxMessageService.toPinnedMessageResponse> {
    return chatBoxMessageService.toPinnedMessageResponse.apply(
      this,
      args as any,
    );
  }

  private toPresenceResponse(
    ...args: Parameters<typeof chatBoxPresenceService.toPresenceResponse>
  ): ReturnType<typeof chatBoxPresenceService.toPresenceResponse> {
    return chatBoxPresenceService.toPresenceResponse.apply(this, args as any);
  }

  private async getActiveMemberCountMap(
    ...args: Parameters<typeof chatBoxRoomService.getActiveMemberCountMap>
  ): ReturnType<typeof chatBoxRoomService.getActiveMemberCountMap> {
    return chatBoxRoomService.getActiveMemberCountMap.apply(this, args as any);
  }

  private async buildRoomRealtimeSnapshot(
    ...args: Parameters<typeof chatBoxRoomService.buildRoomRealtimeSnapshot>
  ): ReturnType<typeof chatBoxRoomService.buildRoomRealtimeSnapshot> {
    return chatBoxRoomService.buildRoomRealtimeSnapshot.apply(
      this,
      args as any,
    );
  }

  private async emitRoomUpdatedEvent(
    ...args: Parameters<typeof chatBoxRoomService.emitRoomUpdatedEvent>
  ): ReturnType<typeof chatBoxRoomService.emitRoomUpdatedEvent> {
    return chatBoxRoomService.emitRoomUpdatedEvent.apply(this, args as any);
  }

  private memberRolePriority(
    ...args: Parameters<typeof chatBoxRoomService.memberRolePriority>
  ): ReturnType<typeof chatBoxRoomService.memberRolePriority> {
    return chatBoxRoomService.memberRolePriority.apply(this, args as any);
  }

  private async getRoomDetailIfAccessible(
    ...args: Parameters<typeof chatBoxRoomService.getRoomDetailIfAccessible>
  ): ReturnType<typeof chatBoxRoomService.getRoomDetailIfAccessible> {
    return chatBoxRoomService.getRoomDetailIfAccessible.apply(
      this,
      args as any,
    );
  }

  private async syncAcceptedInvitationNotification(
    ...args: Parameters<
      typeof chatBoxRoomService.syncAcceptedInvitationNotification
    >
  ): ReturnType<typeof chatBoxRoomService.syncAcceptedInvitationNotification> {
    return chatBoxRoomService.syncAcceptedInvitationNotification.apply(
      this,
      args as any,
    );
  }

  private resolveRoomLabelForNotification(
    ...args: Parameters<
      typeof chatBoxRoomService.resolveRoomLabelForNotification
    >
  ): ReturnType<typeof chatBoxRoomService.resolveRoomLabelForNotification> {
    return chatBoxRoomService.resolveRoomLabelForNotification.apply(
      this,
      args as any,
    );
  }

  private resolveInvitationMemberRole(
    ...args: Parameters<typeof chatBoxRoomService.resolveInvitationMemberRole>
  ): ReturnType<typeof chatBoxRoomService.resolveInvitationMemberRole> {
    return chatBoxRoomService.resolveInvitationMemberRole.apply(
      this,
      args as any,
    );
  }

  private async emitRoomMemberSystemMessage(
    ...args: Parameters<typeof chatBoxRoomService.emitRoomMemberSystemMessage>
  ): ReturnType<typeof chatBoxRoomService.emitRoomMemberSystemMessage> {
    return chatBoxRoomService.emitRoomMemberSystemMessage.apply(
      this,
      args as any,
    );
  }

  private async emitRoomVisibilitySystemMessage(
    ...args: Parameters<
      typeof chatBoxRoomService.emitRoomVisibilitySystemMessage
    >
  ): ReturnType<typeof chatBoxRoomService.emitRoomVisibilitySystemMessage> {
    return chatBoxRoomService.emitRoomVisibilitySystemMessage.apply(
      this,
      args as any,
    );
  }
}
