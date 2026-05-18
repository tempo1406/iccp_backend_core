/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  CHAT_BOX_EVENTS,
  ChatMessageAttachmentPreviewUpdatedDomainEvent,
} from '@modules/chat-box/delegates/constants/chat-box-events.constant';
import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import {
  ChatLinkPreviewStatus,
  LinkPreviewResponse,
} from '@modules/chat-box/message-management/dto/response/link-preview.response';
import { MessageLinkPreviewResponse } from '@modules/chat-box/message-management/dto/response/message-link-preview.response';
import {
  ChatAttachmentPreviewAssetSource,
  MessageAttachmentResponse,
} from '@modules/chat-box/message-management/dto/response/message-attachment.response';
import {
  MessageReactionActorResponse,
  MessageReactionSummaryResponse,
} from '@modules/chat-box/message-management/dto/response/message-reaction-summary.response';
import {
  RoomMessageReplyPreviewResponse,
  RoomMessageResponse,
} from '@modules/chat-box/message-management/dto/response/room-message.response';
import { ChatMessageAttachment } from '@modules/chat-box/message-management/entities/message-attachment.entity';
import {
  ChatMessage,
  ChatMessageType,
} from '@modules/chat-box/message-management/entities/message.entity';
import { User } from '@modules/users/entities/user.entity';
import { NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { ChatBoxServiceDelegateContext } from './message-delegate.types';
import { resolveMessageContentFormatByRichContent } from './message-rich-content.helper';

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

function resolveAttachmentOpenUrl(params: {
  fileUrl: string;
  previewUrl?: string;
}): string {
  return params.previewUrl?.trim() || params.fileUrl;
}

function buildAttachmentDownloadUrl(fileUrl: string): string {
  if (!fileUrl) {
    return fileUrl;
  }

  try {
    const parsed = new URL(fileUrl);
    parsed.searchParams.set('ik-attachment', 'true');
    return parsed.toString();
  } catch {
    return fileUrl;
  }
}

function isUuidV4(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isInternalPreviewState(
  value: unknown,
): value is 'ready' | 'forbidden' | 'message_not_found' | 'message_deleted' {
  return (
    value === 'ready' ||
    value === 'forbidden' ||
    value === 'message_not_found' ||
    value === 'message_deleted'
  );
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function pickOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function pickConversationVisibility(
  value: unknown,
): 'public' | 'private' | undefined {
  return value === 'public' || value === 'private' ? value : undefined;
}

export function buildRoomMessageQuery(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    includeDeleted: boolean;
  },
) {
  const qb = this.messageRepo
    .createQueryBuilder('m')
    .leftJoin(User, 'u', 'u.id = m.sender_id')
    .leftJoin(
      ChatMessage,
      'pm',
      'pm.id = m.parent_message_id AND pm.organization_id = m.organization_id AND pm.room_id = m.room_id',
    )
    .leftJoin(User, 'pu', 'pu.id = pm.sender_id')
    .where('m.organization_id = :organizationId', {
      organizationId: params.organizationId,
    })
    .andWhere('m.room_id = :roomId', { roomId: params.roomId });

  if (!params.includeDeleted) {
    qb.andWhere('m.is_deleted = false');
  }

  return qb.select([
    'm.id AS "id"',
    'm.room_id AS "roomId"',
    'm.organization_id AS "organizationId"',
    'm.sender_id AS "senderId"',
    'm.message_type AS "messageType"',
    'm.content AS "content"',
    'm.rich_content AS "richContent"',
    'm.metadata AS "metadata"',
    'm.client_message_id AS "clientMessageId"',
    'm.parent_message_id AS "parentMessageId"',
    'm.thread_root_message_id AS "threadRootMessageId"',
    'm.is_edited AS "isEdited"',
    'm.is_deleted AS "isDeleted"',
    'm.sent_at AS "sentAt"',
    'u.email AS "senderEmail"',
    'u.first_name AS "senderFirstName"',
    'u.last_name AS "senderLastName"',
    'u.avatar_url AS "senderAvatarUrl"',
    'pm.id AS "replyMessageId"',
    'pm.content AS "replyContent"',
    'pm.sent_at AS "replySentAt"',
    'pm.is_deleted AS "replyIsDeleted"',
    'pm.sender_id AS "replySenderId"',
    'pu.email AS "replySenderEmail"',
    'pu.first_name AS "replySenderFirstName"',
    'pu.last_name AS "replySenderLastName"',
    'pu.avatar_url AS "replySenderAvatarUrl"',
  ]);
}
export async function getRoomMessageById(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    messageId: string;
    includeDeleted?: boolean;
    userId?: string;
  },
): Promise<RoomMessageResponse> {
  const row = await this.buildRoomMessageQuery({
    organizationId: params.organizationId,
    roomId: params.roomId,
    includeDeleted: params.includeDeleted ?? false,
  })
    .andWhere('m.id = :messageId', { messageId: params.messageId })
    .limit(1)
    .getRawOne();

  if (!row) {
    throw new NotFoundException('Message not found');
  }

  const [enriched] = await this.enrichRoomMessages({
    organizationId: params.organizationId,
    userId: params.userId,
    messages: [this.toRoomMessageResponseFromRawRow(row)],
  });
  return enriched;
}
export function toRoomMessageResponseFromRawRow(
  this: ChatBoxServiceDelegateContext,
  row: RawRoomMessageRow,
): RoomMessageResponse {
  const replyPreview = row.replyMessageId
    ? this.toReplyPreviewFromRawRow(row)
    : undefined;
  const content = row.isDeleted ? '[message was deleted]' : row.content;
  const richContent = row.isDeleted ? undefined : row.richContent;

  return {
    id: row.id,
    organizationId: row.organizationId,
    roomId: row.roomId,
    senderId: row.senderId,
    messageType: row.messageType,
    content,
    contentFormat: resolveMessageContentFormatByRichContent(richContent),
    richContent,
    metadata: row.metadata,
    clientMessageId: row.clientMessageId,
    parentMessageId: row.parentMessageId,
    threadRootMessageId: row.threadRootMessageId,
    replyPreview,
    forwardedSnapshot: this.extractForwardedSnapshot(row.metadata),
    isEdited: row.isEdited,
    isDeleted: row.isDeleted,
    sentAt: row.sentAt,
    senderEmail: row.senderEmail,
    senderFirstName: row.senderFirstName,
    senderLastName: row.senderLastName,
    senderAvatarUrl: row.senderAvatarUrl,
  };
}
export function toReplyPreviewFromRawRow(
  this: ChatBoxServiceDelegateContext,
  row: RawRoomMessageRow,
): RoomMessageReplyPreviewResponse {
  const replyContent = row.replyIsDeleted
    ? '[message was deleted]'
    : row.replyContent;

  return {
    id: row.replyMessageId as string,
    content: replyContent,
    senderId: row.replySenderId,
    senderEmail: row.replySenderEmail,
    senderFirstName: row.replySenderFirstName,
    senderLastName: row.replySenderLastName,
    senderAvatarUrl: row.replySenderAvatarUrl,
    sentAt: row.replySentAt,
  };
}
export function extractForwardedSnapshot(
  this: ChatBoxServiceDelegateContext,
  metadata?: Record<string, any>,
): Record<string, any> | undefined {
  const snapshot = metadata?.forwardedSnapshot;
  const hasForwardMetadata =
    metadata?.source === 'forward' ||
    typeof metadata?.forwardedFromMessageId === 'string';
  if (
    (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) &&
    !hasForwardMetadata
  ) {
    return undefined;
  }

  const rawSnapshot =
    snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
      ? (snapshot as Record<string, any>)
      : {};
  const originalSenderId =
    pickOptionalString(rawSnapshot.originalSenderId) ||
    pickOptionalString(rawSnapshot.originalAuthorId);
  const originalSenderEmail =
    pickOptionalString(rawSnapshot.originalSenderEmail) ||
    pickOptionalString(rawSnapshot.originalAuthorEmail);
  const originalSenderFirstName =
    pickOptionalString(rawSnapshot.originalSenderFirstName) ||
    pickOptionalString(rawSnapshot.originalAuthorFirstName);
  const originalSenderLastName =
    pickOptionalString(rawSnapshot.originalSenderLastName) ||
    pickOptionalString(rawSnapshot.originalAuthorLastName);
  const originalSenderDisplayName =
    pickOptionalString(rawSnapshot.originalSenderDisplayName) ||
    (originalSenderId || originalSenderEmail || originalSenderFirstName
      ? this.buildUserDisplayName({
          userId: originalSenderId || originalSenderEmail || 'forwarded-user',
          email: originalSenderEmail,
          firstName: originalSenderFirstName,
          lastName: originalSenderLastName,
        })
      : undefined);
  const originalSenderAvatarUrl =
    pickOptionalString(rawSnapshot.originalSenderAvatarUrl) ||
    pickOptionalString(rawSnapshot.originalAvatarUrl);
  const originalSentAt =
    pickOptionalString(rawSnapshot.originalSentAt) ||
    pickOptionalString(rawSnapshot.originalTime) ||
    pickOptionalString(rawSnapshot.sourceDateLabel);
  const sourceConversationKey =
    pickOptionalString(rawSnapshot.sourceConversationKey) ||
    pickOptionalString(metadata?.forwardedFromConversationKey);
  const sourceConversationLabel =
    pickOptionalString(rawSnapshot.sourceConversationLabel) ||
    pickOptionalString(rawSnapshot.sourceConversationContext);
  const sourceConversationVisibility = pickConversationVisibility(
    rawSnapshot.sourceConversationVisibility,
  );
  const originalRichContent =
    rawSnapshot.originalRichContent &&
    typeof rawSnapshot.originalRichContent === 'object' &&
    !Array.isArray(rawSnapshot.originalRichContent)
      ? rawSnapshot.originalRichContent
      : null;
  const originalContentFormat =
    rawSnapshot.originalContentFormat === ChatMessageContentFormat.RICH_TEXT_V1 ||
    Boolean(originalRichContent)
      ? ChatMessageContentFormat.RICH_TEXT_V1
      : ChatMessageContentFormat.PLAIN_TEXT;

  return {
    ...rawSnapshot,
    originalMessageId:
      pickOptionalString(rawSnapshot.originalMessageId) ||
      pickOptionalString(metadata?.forwardedFromMessageId) ||
      null,
    originalContent:
      typeof rawSnapshot.originalContent === 'string'
        ? rawSnapshot.originalContent
        : '',
    originalContentFormat,
    originalRichContent,
    originalSenderId: originalSenderId ?? null,
    originalSenderEmail: originalSenderEmail ?? null,
    originalSenderFirstName: originalSenderFirstName ?? null,
    originalSenderLastName: originalSenderLastName ?? null,
    originalSenderDisplayName: originalSenderDisplayName ?? null,
    originalSenderAvatarUrl: originalSenderAvatarUrl ?? null,
    originalSentAt: originalSentAt ?? null,
    sourceConversationKey: sourceConversationKey ?? null,
    sourceConversationLabel: sourceConversationLabel ?? null,
    sourceConversationVisibility: sourceConversationVisibility ?? null,
    attachments: Array.isArray(rawSnapshot.attachments)
      ? rawSnapshot.attachments
      : [],
  };
}
export function buildSearchSnippet(
  this: ChatBoxServiceDelegateContext,
  content: string | undefined,
  q: string,
): string {
  const normalizedContent = content?.trim() || '';
  if (!normalizedContent) {
    return '[message has no text content]';
  }

  const lowerContent = normalizedContent.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const matchedIndex = lowerContent.indexOf(lowerQuery);

  if (matchedIndex < 0) {
    return normalizedContent.length > 160
      ? `${normalizedContent.slice(0, 157)}...`
      : normalizedContent;
  }

  const start = Math.max(0, matchedIndex - 40);
  const end = Math.min(
    normalizedContent.length,
    matchedIndex + lowerQuery.length + 60,
  );
  const snippet = normalizedContent.slice(start, end);

  const prefix = start > 0 ? '...' : '';
  const suffix = end < normalizedContent.length ? '...' : '';
  return `${prefix}${snippet}${suffix}`;
}
export async function buildMessageReactionSummaries(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    messageId: string;
    viewerUserId: string;
  },
): Promise<MessageReactionSummaryResponse[]> {
  const summaryByMessage = await this.buildMessageReactionSummariesByMessageIds(
    {
      organizationId: params.organizationId,
      messageIds: [params.messageId],
      viewerUserId: params.viewerUserId,
    },
  );
  return summaryByMessage.get(params.messageId) || [];
}

export async function buildMessageReactionSummariesByMessageIds(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    messageIds: string[];
    viewerUserId?: string;
  },
): Promise<Map<string, MessageReactionSummaryResponse[]>> {
  if (params.messageIds.length === 0) {
    return new Map();
  }

  const rows = await this.reactionRepo
    .createQueryBuilder('r')
    .leftJoin(User, 'u', 'u.id = r.user_id')
    .select([
      'r.message_id AS "messageId"',
      'r.emoji AS "emoji"',
      'r.user_id AS "userId"',
      'r.created_at AS "reactedAt"',
      'u.email AS "email"',
      'u.first_name AS "firstName"',
      'u.last_name AS "lastName"',
      'u.avatar_url AS "avatarUrl"',
    ])
    .where('r.organization_id = :organizationId', {
      organizationId: params.organizationId,
    })
    .andWhere('r.message_id IN (:...messageIds)', {
      messageIds: params.messageIds,
    })
    .orderBy('r.message_id', 'ASC')
    .addOrderBy('r.emoji', 'ASC')
    .addOrderBy('r.created_at', 'ASC')
    .addOrderBy('r.user_id', 'ASC')
    .getRawMany();

  const groupedByMessage = new Map<
    string,
    Map<string, MessageReactionSummaryResponse>
  >();

  for (const row of rows) {
    const messageId = String(row.messageId);
    let groupedByEmoji = groupedByMessage.get(messageId);
    if (!groupedByEmoji) {
      groupedByEmoji = new Map<string, MessageReactionSummaryResponse>();
      groupedByMessage.set(messageId, groupedByEmoji);
    }

    let summary = groupedByEmoji.get(row.emoji);
    if (!summary) {
      summary = {
        emoji: row.emoji,
        count: 0,
        reactedByMe: false,
        reactors: [],
      };
      groupedByEmoji.set(row.emoji, summary);
    }

    const reactor: MessageReactionActorResponse = {
      userId: row.userId,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: this.buildUserDisplayName({
        userId: row.userId,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
      }),
      avatarUrl: row.avatarUrl,
      reactedAt: new Date(row.reactedAt),
    };

    summary.count += 1;
    if (params.viewerUserId && row.userId === params.viewerUserId) {
      summary.reactedByMe = true;
    }
    summary.reactors.push(reactor);
  }

  const result = new Map<string, MessageReactionSummaryResponse[]>();
  for (const messageId of params.messageIds) {
    const groupedByEmoji = groupedByMessage.get(messageId);
    if (!groupedByEmoji) {
      result.set(messageId, []);
      continue;
    }

    const summaries = Array.from(groupedByEmoji.values()).sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.emoji.localeCompare(b.emoji);
    });
    result.set(messageId, summaries);
  }

  return result;
}
export function pickReactionSummary(
  this: ChatBoxServiceDelegateContext,
  params: {
    reactionSummaries: MessageReactionSummaryResponse[];
    emoji: string;
  },
): MessageReactionSummaryResponse {
  const found = params.reactionSummaries.find(
    (summary) => summary.emoji === params.emoji,
  );
  if (found) {
    return found;
  }

  return {
    emoji: params.emoji,
    count: 0,
    reactedByMe: false,
    reactors: [],
  };
}
export function toRoomMessageResponse(
  this: ChatBoxServiceDelegateContext,
  message: ChatMessage,
  sender?: User,
): RoomMessageResponse {
  return {
    id: message.id,
    organizationId: message.organizationId,
    roomId: message.roomId,
    senderId: message.senderId,
    messageType: message.messageType,
    content: message.content,
    contentFormat: resolveMessageContentFormatByRichContent(message.richContent),
    richContent: message.richContent,
    metadata: message.metadata,
    clientMessageId: message.clientMessageId,
    parentMessageId: message.parentMessageId,
    threadRootMessageId: message.threadRootMessageId,
    forwardedSnapshot: this.extractForwardedSnapshot(message.metadata),
    linkPreviews: this.extractLinkPreviewsFromMetadata(message.metadata),
    isEdited: message.isEdited,
    isDeleted: message.isDeleted,
    sentAt: message.sentAt,
    senderEmail: sender?.email,
    senderFirstName: sender?.firstName,
    senderLastName: sender?.lastName,
    senderAvatarUrl: sender?.avatarUrl,
  };
}
export function toMessageAttachmentResponse(
  this: ChatBoxServiceDelegateContext,
  attachment: ChatMessageAttachment,
): MessageAttachmentResponse {
  const preview = this.buildAttachmentPreview({
    attachmentType: attachment.attachmentType,
    fileUrl: attachment.fileUrl,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    previewDocumentType: attachment.documentType,
    previewStatus: attachment.previewStatus,
    previewThumbnailUrl: attachment.previewThumbnailUrl,
    previewUrl: attachment.previewUrl,
    previewWidth: attachment.previewWidth,
    previewHeight: attachment.previewHeight,
    previewPage: attachment.previewPage,
    pageCount: attachment.pageCount,
    previewErrorCode: attachment.previewErrorCode,
    previewUpdatedAt: attachment.previewUpdatedAt,
  });
  const previewUpdatedAt =
    preview.previewUpdatedAt ||
    (preview.previewStatus === 'ready' || preview.previewStatus === 'failed'
      ? attachment.createdAt
      : undefined);
  const previewAssetSource = this.resolveAttachmentPreviewAssetSource({
    attachmentType: attachment.attachmentType,
    documentType: preview.documentType,
    previewStatus: preview.previewStatus,
    thumbnailUrl: preview.thumbnailUrl,
  });
  const thumbnailVariants = this.buildAttachmentThumbnailVariants(
    preview.thumbnailUrl,
  );
  const previewVersion = this.buildAttachmentPreviewVersion({
    previewStatus: preview.previewStatus,
    previewUpdatedAt,
    thumbnailUrl: preview.thumbnailUrl,
    previewUrl: preview.previewUrl,
    previewErrorCode: preview.previewErrorCode,
    previewAssetSource,
  });
  const openUrl = resolveAttachmentOpenUrl({
    fileUrl: attachment.fileUrl,
    previewUrl: preview.previewUrl,
  });
  const downloadUrl = buildAttachmentDownloadUrl(attachment.fileUrl);

  return {
    id: attachment.id,
    organizationId: attachment.organizationId,
    messageId: attachment.messageId,
    attachmentType: attachment.attachmentType,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    mimeType: attachment.mimeType,
    fileSize: attachment.fileSize,
    checksum: attachment.checksum,
    width: attachment.width,
    height: attachment.height,
    durationMs: attachment.durationMs,
    thumbnailUrl: preview.thumbnailUrl,
    thumbnailUrlSmall: thumbnailVariants.thumbnailUrlSmall,
    thumbnailUrlMedium: thumbnailVariants.thumbnailUrlMedium,
    previewUrl: preview.previewUrl,
    openUrl,
    downloadUrl,
    documentType: preview.documentType,
    previewStatus: preview.previewStatus,
    previewAssetSource,
    previewWidth: preview.previewWidth,
    previewHeight: preview.previewHeight,
    previewPage: preview.previewPage,
    pageCount: preview.pageCount,
    previewUpdatedAt,
    previewErrorCode: preview.previewErrorCode,
    previewVersion,
    createdAt: attachment.createdAt,
  };
}
export function emitAttachmentPreviewUpdatedEvent(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    messageId: string;
    actorUserId: string;
    attachment: MessageAttachmentResponse;
  },
): void {
  const event: ChatMessageAttachmentPreviewUpdatedDomainEvent = {
    organizationId: params.organizationId,
    roomId: params.roomId,
    messageId: params.messageId,
    attachmentId: params.attachment.id,
    actorUserId: params.actorUserId,
    attachment: params.attachment,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(
    CHAT_BOX_EVENTS.MESSAGE_ATTACHMENT_PREVIEW_UPDATED,
    event,
  );
}
export async function buildLinkPreviewPlan(
  this: ChatBoxServiceDelegateContext,
  params: {
    content?: string;
    metadata?: Record<string, any>;
    eagerFetch: boolean;
  },
): Promise<{
  metadata?: Record<string, any>;
  pendingUrls: string[];
}> {
  const baseMetadata = this.normalizeMessageMetadata(params.metadata);
  const urls = this.chatLinkPreviewService.extractUrls(params.content);
  if (urls.length === 0) {
    const cleanedMetadata = { ...baseMetadata };
    delete cleanedMetadata.linkPreviews;
    delete cleanedMetadata.linkPreviewPendingUrls;
    delete cleanedMetadata.linkPreviewFailedUrls;
    delete cleanedMetadata.linkPreviewStatus;
    delete cleanedMetadata.linkPreviewVersion;
    return {
      metadata:
        Object.keys(cleanedMetadata).length > 0 ? cleanedMetadata : undefined,
      pendingUrls: [],
    };
  }

  const resolved = await this.chatLinkPreviewService.resolveUrlList({
    urls,
    eagerFetch: params.eagerFetch,
  });
  const mergedMetadata: Record<string, any> = {
    ...baseMetadata,
    linkPreviews: resolved.resolved,
    linkPreviewPendingUrls: resolved.pendingUrls,
    linkPreviewFailedUrls: [],
    linkPreviewStatus: this.computeLinkPreviewStatus({
      resolvedCount: resolved.resolved.length,
      pendingCount: resolved.pendingUrls.length,
      failedCount: 0,
    }),
    linkPreviewVersion: 'v2',
  };

  return {
    metadata: mergedMetadata,
    pendingUrls: resolved.pendingUrls,
  };
}
export function normalizeMessageMetadata(
  this: ChatBoxServiceDelegateContext,
  metadata?: Record<string, any> | null,
): Record<string, any> {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  return { ...metadata };
}
export function computeLinkPreviewStatus(
  this: ChatBoxServiceDelegateContext,
  params: {
    resolvedCount: number;
    pendingCount: number;
    failedCount: number;
  },
): ChatLinkPreviewStatus {
  if (params.pendingCount > 0) {
    return params.resolvedCount > 0 || params.failedCount > 0
      ? 'partial'
      : 'pending';
  }
  if (params.resolvedCount > 0 && params.failedCount > 0) {
    return 'partial';
  }
  if (params.resolvedCount > 0) {
    return 'ready';
  }
  if (params.failedCount > 0) {
    return 'failed';
  }
  return 'pending';
}
export async function enrichRoomMessages(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId?: string;
    messages: RoomMessageResponse[];
    resolveInternalLinkPreviews?: boolean;
  },
): Promise<RoomMessageResponse[]> {
  if (params.messages.length === 0) {
    return params.messages;
  }

  const messageIds = params.messages.map((message) => message.id);
  const attachmentRows = await this.attachmentRepo.find({
    where: {
      organizationId: params.organizationId,
      messageId: In(messageIds),
    },
    order: {
      createdAt: 'ASC',
    },
  });
  const attachmentsByMessage = new Map<string, MessageAttachmentResponse[]>();
  for (const attachment of attachmentRows) {
    const list = attachmentsByMessage.get(attachment.messageId) || [];
    list.push(this.toMessageAttachmentResponse(attachment));
    attachmentsByMessage.set(attachment.messageId, list);
  }
  const reactionSummariesByMessage =
    await this.buildMessageReactionSummariesByMessageIds({
      organizationId: params.organizationId,
      messageIds,
      viewerUserId: params.userId,
    });
  const shouldResolveInternalLinkPreviews =
    (params.resolveInternalLinkPreviews ?? true) && Boolean(params.userId);

  const internalPreviewCache = new Map<
    string,
    Promise<MessageLinkPreviewResponse | null>
  >();

  const enrichLinkPreviewForViewer = async (
    preview: LinkPreviewResponse,
  ): Promise<LinkPreviewResponse> => {
    if (!shouldResolveInternalLinkPreviews) {
      return preview;
    }

    const reference = preview.internalReference;
    if (reference?.kind !== 'team_chat_message') {
      return preview;
    }

    const cacheKey = `${reference.roomId}:${reference.messageId}`;
    let resolver = internalPreviewCache.get(cacheKey);
    if (!resolver) {
      const createdResolver: Promise<MessageLinkPreviewResponse | null> =
        this.getMessageLinkPreview(
          params.organizationId,
          params.userId as string,
          {
            roomId: reference.roomId,
            messageId: reference.messageId,
          },
        ).catch(() => null);
      internalPreviewCache.set(cacheKey, createdResolver);
      resolver = createdResolver;
    }

    const resolved = await resolver;
    if (!resolved) {
      return {
        ...preview,
        internalReference: {
          ...reference,
          previewState: reference.previewState || 'message_not_found',
        },
      };
    }

    return {
      ...preview,
      internalReference: {
        ...reference,
        deepLinkUrl: resolved.deepLinkUrl || reference.deepLinkUrl,
        previewState: resolved.state,
        roomSnapshot: resolved.room,
        messageSnapshot: resolved.message,
      },
    };
  };

  const enrichedMessages = await Promise.all(
    params.messages.map(async (message) => {
      if (message.isDeleted) {
        return {
          ...message,
          attachments: [],
          linkPreviews: [],
          reactionSummaries: [],
        };
      }

      const parsedLinkPreviews = this.extractLinkPreviewsFromMetadata(
        message.metadata,
      );
      const linkPreviews = await Promise.all(
        parsedLinkPreviews.map((preview) =>
          enrichLinkPreviewForViewer(preview),
        ),
      );

      return {
        ...message,
        attachments: attachmentsByMessage.get(message.id) || [],
        linkPreviews,
        reactionSummaries: reactionSummariesByMessage.get(message.id) || [],
      };
    }),
  );

  return enrichedMessages;
}
export function extractLinkPreviewsFromMetadata(
  this: ChatBoxServiceDelegateContext,
  metadata?: Record<string, any>,
): LinkPreviewResponse[] {
  const raw = metadata?.linkPreviews;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item) => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const row = item as Record<string, any>;
      if (typeof row.url !== 'string') {
        return null;
      }
      const type =
        row.type === 'image' ||
        row.type === 'video' ||
        row.type === 'file' ||
        row.type === 'document'
          ? row.type
          : 'website';
      const status =
        row.status === 'pending' ||
        row.status === 'partial' ||
        row.status === 'ready' ||
        row.status === 'failed' ||
        row.status === 'disabled'
          ? row.status
          : 'ready';
      const title =
        typeof row.title === 'string' && row.title.trim()
          ? row.title
          : typeof row.resourceTitle === 'string' && row.resourceTitle.trim()
            ? row.resourceTitle
            : row.url;
      const internalReferenceRaw =
        row.internalReference &&
        typeof row.internalReference === 'object' &&
        !Array.isArray(row.internalReference)
          ? (row.internalReference as Record<string, any>)
          : undefined;
      const internalRoomId =
        typeof internalReferenceRaw?.roomId === 'string'
          ? internalReferenceRaw.roomId
          : '';
      const internalMessageId =
        typeof internalReferenceRaw?.messageId === 'string'
          ? internalReferenceRaw.messageId
          : '';
      const internalDeepLinkUrl =
        typeof internalReferenceRaw?.deepLinkUrl === 'string'
          ? internalReferenceRaw.deepLinkUrl
          : undefined;
      const previewState = isInternalPreviewState(
        internalReferenceRaw?.previewState,
      )
        ? internalReferenceRaw.previewState
        : undefined;
      const roomSnapshotRaw =
        internalReferenceRaw?.roomSnapshot &&
        typeof internalReferenceRaw.roomSnapshot === 'object' &&
        !Array.isArray(internalReferenceRaw.roomSnapshot)
          ? (internalReferenceRaw.roomSnapshot as Record<string, any>)
          : undefined;
      const roomSnapshotId =
        typeof roomSnapshotRaw?.id === 'string' ? roomSnapshotRaw.id : '';
      const roomSnapshotType =
        roomSnapshotRaw?.roomType === 'channel' ||
        roomSnapshotRaw?.roomType === 'dm' ||
        roomSnapshotRaw?.roomType === 'group_dm'
          ? roomSnapshotRaw.roomType
          : undefined;
      const roomSnapshotVisibility =
        roomSnapshotRaw?.visibility === 'public' ||
        roomSnapshotRaw?.visibility === 'private'
          ? roomSnapshotRaw.visibility
          : undefined;
      const roomSnapshot =
        isUuidV4(roomSnapshotId) &&
        Boolean(roomSnapshotType) &&
        Boolean(roomSnapshotVisibility)
          ? {
              id: roomSnapshotId,
              roomType: roomSnapshotType,
              visibility: roomSnapshotVisibility,
              name:
                typeof roomSnapshotRaw?.name === 'string'
                  ? roomSnapshotRaw.name
                  : undefined,
              roomKey:
                typeof roomSnapshotRaw?.roomKey === 'string'
                  ? roomSnapshotRaw.roomKey
                  : undefined,
            }
          : undefined;
      const messageSnapshotRaw =
        internalReferenceRaw?.messageSnapshot &&
        typeof internalReferenceRaw.messageSnapshot === 'object' &&
        !Array.isArray(internalReferenceRaw.messageSnapshot)
          ? (internalReferenceRaw.messageSnapshot as Record<string, any>)
          : undefined;
      const messageSnapshotId =
        typeof messageSnapshotRaw?.id === 'string' ? messageSnapshotRaw.id : '';
      const messageSnapshot =
        isUuidV4(messageSnapshotId) &&
        typeof messageSnapshotRaw?.isDeleted === 'boolean' &&
        typeof messageSnapshotRaw?.hasAttachments === 'boolean'
          ? {
              id: messageSnapshotId,
              authorId:
                typeof messageSnapshotRaw?.authorId === 'string'
                  ? messageSnapshotRaw.authorId
                  : undefined,
              authorName:
                typeof messageSnapshotRaw?.authorName === 'string'
                  ? messageSnapshotRaw.authorName
                  : undefined,
              authorAvatarUrl:
                typeof messageSnapshotRaw?.authorAvatarUrl === 'string'
                  ? messageSnapshotRaw.authorAvatarUrl
                  : undefined,
              contentPreview:
                typeof messageSnapshotRaw?.contentPreview === 'string'
                  ? messageSnapshotRaw.contentPreview
                  : undefined,
              createdAt: parseOptionalDate(messageSnapshotRaw?.createdAt),
              isDeleted: messageSnapshotRaw.isDeleted,
              hasAttachments: messageSnapshotRaw.hasAttachments,
            }
          : undefined;
      const internalReference =
        internalReferenceRaw?.kind === 'team_chat_message' &&
        isUuidV4(internalRoomId) &&
        isUuidV4(internalMessageId) &&
        Boolean(internalDeepLinkUrl)
          ? {
              kind: 'team_chat_message' as const,
              roomId: internalRoomId,
              messageId: internalMessageId,
              deepLinkUrl: internalDeepLinkUrl as string,
              previewState,
              roomSnapshot,
              messageSnapshot,
            }
          : undefined;
      const normalized = {
        url: row.url,
        canonicalUrl:
          typeof row.canonicalUrl === 'string' ? row.canonicalUrl : undefined,
        displayUrl:
          typeof row.displayUrl === 'string' ? row.displayUrl : undefined,
        internalReference,
        status,
        provider: typeof row.provider === 'string' ? row.provider : undefined,
        providerName:
          typeof row.providerName === 'string' ? row.providerName : undefined,
        providerIconUrl:
          typeof row.providerIconUrl === 'string'
            ? row.providerIconUrl
            : undefined,
        siteName: typeof row.siteName === 'string' ? row.siteName : undefined,
        resourceTitle:
          typeof row.resourceTitle === 'string' ? row.resourceTitle : undefined,
        resourceType:
          typeof row.resourceType === 'string' ? row.resourceType : undefined,
        resourceTypeLabel:
          typeof row.resourceTypeLabel === 'string'
            ? row.resourceTypeLabel
            : undefined,
        title,
        description:
          typeof row.description === 'string' ? row.description : undefined,
        excerpt: typeof row.excerpt === 'string' ? row.excerpt : undefined,
        imageUrl: typeof row.imageUrl === 'string' ? row.imageUrl : undefined,
        thumbnailUrl:
          typeof row.thumbnailUrl === 'string' ? row.thumbnailUrl : undefined,
        previewImageUrl:
          typeof row.previewImageUrl === 'string'
            ? row.previewImageUrl
            : undefined,
        previewImageAlt:
          typeof row.previewImageAlt === 'string'
            ? row.previewImageAlt
            : undefined,
        previewAssetId:
          typeof row.previewAssetId === 'string'
            ? row.previewAssetId
            : undefined,
        previewAssetStatus:
          row.previewAssetStatus === 'pending' ||
          row.previewAssetStatus === 'ready' ||
          row.previewAssetStatus === 'failed'
            ? row.previewAssetStatus
            : undefined,
        previewAssetSource:
          row.previewAssetSource === 'rendered' ||
          row.previewAssetSource === 'cached' ||
          row.previewAssetSource === 'proxied' ||
          row.previewAssetSource === 'external' ||
          row.previewAssetSource === 'fallback'
            ? row.previewAssetSource
            : undefined,
        previewAssetErrorCode:
          typeof row.previewAssetErrorCode === 'string'
            ? row.previewAssetErrorCode
            : undefined,
        previewVersion:
          typeof row.previewVersion === 'string'
            ? row.previewVersion
            : undefined,
        previewImageWidth:
          typeof row.previewImageWidth === 'number'
            ? row.previewImageWidth
            : undefined,
        previewImageHeight:
          typeof row.previewImageHeight === 'number'
            ? row.previewImageHeight
            : undefined,
        type,
        mediaType:
          row.mediaType === 'website' ||
          row.mediaType === 'image' ||
          row.mediaType === 'video' ||
          row.mediaType === 'file' ||
          row.mediaType === 'document'
            ? row.mediaType
            : type,
        mimeType: typeof row.mimeType === 'string' ? row.mimeType : undefined,
        contentType:
          typeof row.contentType === 'string' ? row.contentType : undefined,
        embedUrl: typeof row.embedUrl === 'string' ? row.embedUrl : undefined,
        width: typeof row.width === 'number' ? row.width : undefined,
        height: typeof row.height === 'number' ? row.height : undefined,
        durationMs:
          typeof row.durationMs === 'number' ? row.durationMs : undefined,
        fetchedAt:
          typeof row.fetchedAt === 'string'
            ? row.fetchedAt
            : new Date().toISOString(),
      } as LinkPreviewResponse;
      return this.chatLinkPreviewService.normalizePreviewAssetForResponse(
        normalized,
      );
    })
    .filter((item): item is LinkPreviewResponse => Boolean(item));
}
