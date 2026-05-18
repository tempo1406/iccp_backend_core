/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { PaginatedResponse } from '@common/dto/paginated.response';
import { PaginationHelper } from '@common/helpers/pagination.helper';
import { ListRoomAttachmentsQueryRequest } from '@modules/chat-box/message-management/dto/request/list-room-attachments-query.request';
import { GetMessageLinkPreviewQueryRequest } from '@modules/chat-box/message-management/dto/request/get-message-link-preview-query.request';
import { GetRoomMessageContextQueryRequest } from '@modules/chat-box/message-management/dto/request/get-room-message-context-query.request';
import { ListRoomMessagesCursorQueryRequest } from '@modules/chat-box/message-management/dto/request/list-room-messages-cursor-query.request';
import { ListRoomMessagesQueryRequest } from '@modules/chat-box/message-management/dto/request/list-room-messages-query.request';
import { SearchRoomMessagesQueryRequest } from '@modules/chat-box/message-management/dto/request/search-room-messages-query.request';
import { ListRoomMessagesCursorResponse } from '@modules/chat-box/message-management/dto/response/list-room-messages-cursor.response';
import {
  MessageLinkPreviewMessageResponse,
  MessageLinkPreviewResponse,
  MessageLinkPreviewRoomResponse,
} from '@modules/chat-box/message-management/dto/response/message-link-preview.response';
import { RoomAttachmentItemResponse } from '@modules/chat-box/message-management/dto/response/room-attachment-item.response';
import { RoomMessageContextResponse } from '@modules/chat-box/message-management/dto/response/room-message-context.response';
import {
  RoomMessageSearchItemResponse,
  SearchRoomMessagesResponse,
} from '@modules/chat-box/message-management/dto/response/search-room-messages.response';
import { RoomMessageResponse } from '@modules/chat-box/message-management/dto/response/room-message.response';
import { ChatMessage } from '@modules/chat-box/message-management/entities/message.entity';
import { ChatRoomVisibility } from '@modules/chat-box/room-management/entities/room.entity';
import { User } from '@modules/users/entities/user.entity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChatBoxServiceDelegateContext } from './message-delegate.types';

type RawRoomMessageRow = {
  id: string;
  roomId: string;
  organizationId: string;
  senderId?: string;
  messageType: string;
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

const INTERNAL_PREVIEW_CONTENT_MAX_LENGTH = 180;

function toMessageLinkDeepLink(params: {
  roomId: string;
  messageId: string;
}): string {
  return `/team-chat?roomId=${encodeURIComponent(params.roomId)}&messageId=${encodeURIComponent(params.messageId)}`;
}

function toMessageLinkPreviewRoom(params: {
  room: {
    id: string;
    roomType: string;
    visibility: string;
    name?: string;
    roomKey?: string;
  };
  includeReadableLabels: boolean;
}): MessageLinkPreviewRoomResponse {
  return {
    id: params.room.id,
    roomType: params.room.roomType as MessageLinkPreviewRoomResponse['roomType'],
    visibility:
      params.room.visibility as MessageLinkPreviewRoomResponse['visibility'],
    name: params.includeReadableLabels ? params.room.name : undefined,
    roomKey: params.includeReadableLabels ? params.room.roomKey : undefined,
  };
}

function toMessageContentPreview(content?: string): string | undefined {
  const normalized = content?.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized.length <= INTERNAL_PREVIEW_CONTENT_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, INTERNAL_PREVIEW_CONTENT_MAX_LENGTH - 3)}...`;
}

export async function getMessageLinkPreview(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  query: GetMessageLinkPreviewQueryRequest,
): Promise<MessageLinkPreviewResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const room = await this.roomRepo.findOne({
    where: {
      id: query.roomId,
      organizationId,
    },
  });
  if (!room) {
    throw new NotFoundException('Chat room not found');
  }

  const deepLinkUrl = toMessageLinkDeepLink({
    roomId: query.roomId,
    messageId: query.messageId,
  });

  let canViewRoomMessages = false;
  try {
    await this.getRoomAccessForCaller(organizationId, query.roomId, userId);
    canViewRoomMessages = true;
  } catch (error) {
    if (!(error instanceof ForbiddenException)) {
      throw error;
    }
  }

  if (!canViewRoomMessages) {
    return {
      accessible: false,
      state: 'forbidden',
      room: toMessageLinkPreviewRoom({
        room,
        includeReadableLabels: room.visibility === ChatRoomVisibility.PUBLIC,
      }),
      deepLinkUrl,
    };
  }

  const targetMessage = await this.messageRepo.findOne({
    where: {
      id: query.messageId,
      organizationId,
      roomId: query.roomId,
    },
  });
  if (!targetMessage) {
    return {
      accessible: false,
      state: 'message_not_found',
      room: toMessageLinkPreviewRoom({
        room,
        includeReadableLabels: true,
      }),
      deepLinkUrl,
    };
  }

  const sender = targetMessage.senderId
    ? await this.userRepo.findOne({
        where: { id: targetMessage.senderId },
        select: ['id', 'email', 'firstName', 'lastName', 'avatarUrl'],
      })
    : undefined;
  const hasAttachments = targetMessage.isDeleted
    ? false
    : (await this.attachmentRepo.count({
        where: {
          organizationId,
          messageId: targetMessage.id,
        },
      })) > 0;
  const messagePreview: MessageLinkPreviewMessageResponse = {
    id: targetMessage.id,
    authorId: targetMessage.senderId,
    authorName: targetMessage.senderId
      ? this.buildUserDisplayName({
          userId: targetMessage.senderId,
          email: sender?.email,
          firstName: sender?.firstName,
          lastName: sender?.lastName,
        })
      : undefined,
    authorAvatarUrl: sender?.avatarUrl,
    contentPreview: targetMessage.isDeleted
      ? 'Message unavailable'
      : toMessageContentPreview(targetMessage.content),
    createdAt: targetMessage.sentAt,
    isDeleted: targetMessage.isDeleted,
    hasAttachments,
  };

  return {
    accessible: true,
    state: targetMessage.isDeleted ? 'message_deleted' : 'ready',
    room: toMessageLinkPreviewRoom({
      room,
      includeReadableLabels: true,
    }),
    message: messagePreview,
    deepLinkUrl,
  };
}

export async function getRoomMessageContext(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
  query: GetRoomMessageContextQueryRequest,
): Promise<RoomMessageContextResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const room = await this.roomRepo.findOne({
    where: {
      id: roomId,
      organizationId,
    },
  });
  if (!room) {
    throw new NotFoundException('Chat room not found');
  }

  const deepLinkUrl = toMessageLinkDeepLink({
    roomId,
    messageId,
  });

  let canViewRoomMessages = false;
  try {
    await this.getRoomAccessForCaller(organizationId, roomId, userId);
    canViewRoomMessages = true;
  } catch (error) {
    if (!(error instanceof ForbiddenException)) {
      throw error;
    }
  }

  if (!canViewRoomMessages) {
    return {
      accessible: false,
      state: 'forbidden',
      room: toMessageLinkPreviewRoom({
        room,
        includeReadableLabels: room.visibility === ChatRoomVisibility.PUBLIC,
      }),
      targetMessageId: messageId,
      items: [],
      hasOlder: false,
      hasNewer: false,
      deepLinkUrl,
    };
  }

  const targetMessage = await this.messageRepo.findOne({
    where: {
      id: messageId,
      organizationId,
      roomId,
    },
    select: ['id', 'sentAt', 'isDeleted'],
  });
  if (!targetMessage) {
    return {
      accessible: false,
      state: 'message_not_found',
      room: toMessageLinkPreviewRoom({
        room,
        includeReadableLabels: true,
      }),
      targetMessageId: messageId,
      items: [],
      hasOlder: false,
      hasNewer: false,
      deepLinkUrl,
    };
  }

  const beforeLimit = query.before ?? 20;
  const afterLimit = query.after ?? 20;

  const targetRow = (await this.buildRoomMessageQuery({
    organizationId,
    roomId,
    includeDeleted: true,
  })
    .andWhere('m.id = :messageId', { messageId })
    .limit(1)
    .getRawOne()) as RawRoomMessageRow | null;

  if (!targetRow) {
    return {
      accessible: false,
      state: 'message_not_found',
      room: toMessageLinkPreviewRoom({
        room,
        includeReadableLabels: true,
      }),
      targetMessageId: messageId,
      items: [],
      hasOlder: false,
      hasNewer: false,
      deepLinkUrl,
    };
  }

  const beforeRowsDesc = (await this.buildRoomMessageQuery({
    organizationId,
    roomId,
    includeDeleted: true,
  })
    .andWhere(
      '(m.sent_at < :targetSentAt OR (m.sent_at = :targetSentAt AND m.id < :targetId))',
      {
        targetSentAt: targetMessage.sentAt,
        targetId: targetMessage.id,
      },
    )
    .orderBy('m.sent_at', 'DESC')
    .addOrderBy('m.id', 'DESC')
    .limit(beforeLimit + 1)
    .getRawMany()) as RawRoomMessageRow[];
  const hasOlder = beforeRowsDesc.length > beforeLimit;
  const beforeRows = (hasOlder
    ? beforeRowsDesc.slice(0, beforeLimit)
    : beforeRowsDesc
  ).reverse();

  const afterRowsAsc = (await this.buildRoomMessageQuery({
    organizationId,
    roomId,
    includeDeleted: true,
  })
    .andWhere(
      '(m.sent_at > :targetSentAt OR (m.sent_at = :targetSentAt AND m.id > :targetId))',
      {
        targetSentAt: targetMessage.sentAt,
        targetId: targetMessage.id,
      },
    )
    .orderBy('m.sent_at', 'ASC')
    .addOrderBy('m.id', 'ASC')
    .limit(afterLimit + 1)
    .getRawMany()) as RawRoomMessageRow[];
  const hasNewer = afterRowsAsc.length > afterLimit;
  const afterRows = hasNewer ? afterRowsAsc.slice(0, afterLimit) : afterRowsAsc;

  const contextRows = [...beforeRows, targetRow, ...afterRows];
  const contextMessages = contextRows.map((row) =>
    this.toRoomMessageResponseFromRawRow(row),
  );
  const items = await this.enrichRoomMessages({
    organizationId,
    userId,
    messages: contextMessages,
  });
  const normalizedItems = targetMessage.isDeleted
    ? items.map((item) =>
        item.id === targetMessage.id ? { ...item, content: '' } : item,
      )
    : items;

  const oldest = contextRows[0];
  const newest = contextRows[contextRows.length - 1];

  return {
    accessible: true,
    state: targetMessage.isDeleted ? 'message_deleted' : 'ready',
    room: toMessageLinkPreviewRoom({
      room,
      includeReadableLabels: true,
    }),
    targetMessageId: targetMessage.id,
    items: normalizedItems,
    olderCursor:
      hasOlder && oldest
        ? this.encodeRoomMessageCursor({
            sentAt: oldest.sentAt,
            id: oldest.id,
          })
        : undefined,
    newerCursor:
      hasNewer && newest
        ? this.encodeRoomMessageCursor({
            sentAt: newest.sentAt,
            id: newest.id,
          })
        : undefined,
    hasOlder,
    hasNewer,
    deepLinkUrl,
  };
}

export async function searchRoomMessages(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  query: SearchRoomMessagesQueryRequest,
): Promise<SearchRoomMessagesResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const keyword = query.q?.trim();
  if (!keyword) {
    throw new BadRequestException('q is required');
  }

  const limit = query.limit || 20;
  const normalizedKeyword = keyword.replace(/\s+/g, ' ').trim();
  const useFullTextSearch = normalizedKeyword.length >= 3;
  const qb = this.messageRepo
    .createQueryBuilder('m')
    .leftJoin(User, 'u', 'u.id = m.sender_id')
    .where('m.organization_id = :organizationId', { organizationId })
    .andWhere('m.room_id = :roomId', { roomId })
    .andWhere('m.is_deleted = false')
    .andWhere('m.content IS NOT NULL')
    .select([
      'm.id AS "messageId"',
      'm.room_id AS "roomId"',
      'm.sender_id AS "senderId"',
      'm.message_type AS "messageType"',
      'm.content AS "content"',
      'm.sent_at AS "sentAt"',
      'u.email AS "senderEmail"',
      'u.first_name AS "senderFirstName"',
      'u.last_name AS "senderLastName"',
      'u.avatar_url AS "senderAvatarUrl"',
    ]);

  if (useFullTextSearch) {
    qb.andWhere(
      `to_tsvector('simple', COALESCE(m.content, '')) @@ plainto_tsquery('simple', :keywordTs)`,
      { keywordTs: normalizedKeyword },
    ).addSelect(
      `ts_rank_cd(to_tsvector('simple', COALESCE(m.content, '')), plainto_tsquery('simple', :keywordTs))`,
      'searchRank',
    );
  } else {
    qb.andWhere('m.content ILIKE :keywordLike', {
      keywordLike: `%${normalizedKeyword}%`,
    });
  }

  if (query.cursor) {
    qb.andWhere('m.sent_at < :cursor', { cursor: new Date(query.cursor) });
  }

  const rows = await qb
    .orderBy(useFullTextSearch ? '"searchRank"' : 'm.sent_at', 'DESC')
    .addOrderBy('m.sent_at', 'DESC')
    .addOrderBy('m.id', 'DESC')
    .limit(limit + 1)
    .getRawMany();

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = pageRows.map((row) => ({
    ...row,
    snippet: this.buildSearchSnippet(row.content, normalizedKeyword),
  }));
  const nextCursor = hasMore
    ? new Date(pageRows[pageRows.length - 1].sentAt).toISOString()
    : undefined;

  return {
    items,
    hasMore,
    nextCursor,
  };
}
export async function listRoomAttachments(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  query: ListRoomAttachmentsQueryRequest,
): Promise<PaginatedResponse<RoomAttachmentItemResponse>> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const qb = this.attachmentRepo
    .createQueryBuilder('a')
    .innerJoin(
      ChatMessage,
      'm',
      'm.id = a.message_id AND m.organization_id = :organizationId AND m.room_id = :roomId AND m.is_deleted = false',
      { organizationId, roomId },
    )
    .leftJoin(User, 'u', 'u.id = m.sender_id')
    .where('a.organization_id = :organizationId', { organizationId });

  if (query.type) {
    qb.andWhere('a.attachment_type = :attachmentType', {
      attachmentType: query.type,
    });
  }

  if (query.search) {
    qb.andWhere('(a.file_name ILIKE :search OR m.content ILIKE :search)', {
      search: `%${query.search}%`,
    });
  }

  const total = await qb.getCount();
  const sortableFields: Record<string, string> = {
    createdAt: 'a.created_at',
    messageSentAt: 'm.sent_at',
    fileName: 'a.file_name',
    fileSize: 'a.file_size',
  };
  const sortBy = sortableFields[query.sortBy || ''] || 'a.created_at';
  const sortOrder = query.sortOrder ?? 'DESC';
  const { skip, take } = PaginationHelper.getSkipAndTake(query);

  const rows = await qb
    .select([
      'a.id AS "attachmentId"',
      'a.message_id AS "messageId"',
      'a.attachment_type AS "attachmentType"',
      'a.file_name AS "fileName"',
      'a.file_url AS "fileUrl"',
      'a.mime_type AS "mimeType"',
      'a.file_size AS "fileSize"',
      'a.checksum AS "checksum"',
      'a.width AS "width"',
      'a.height AS "height"',
      'a.duration_ms AS "durationMs"',
      'a.document_type AS "documentType"',
      'a.preview_status AS "previewStatus"',
      'a.preview_thumbnail_url AS "thumbnailUrl"',
      'a.preview_url AS "previewUrl"',
      'a.preview_width AS "previewWidth"',
      'a.preview_height AS "previewHeight"',
      'a.preview_page AS "previewPage"',
      'a.page_count AS "pageCount"',
      'a.preview_error_code AS "previewErrorCode"',
      'a.preview_updated_at AS "previewUpdatedAt"',
      'a.created_at AS "createdAt"',
      'm.sent_at AS "messageSentAt"',
      'm.sender_id AS "sharedByUserId"',
      'u.email AS "sharedByEmail"',
      'u.first_name AS "sharedByFirstName"',
      'u.last_name AS "sharedByLastName"',
    ])
    .orderBy(sortBy, sortOrder)
    .offset(skip)
    .limit(take)
    .getRawMany();

  const items: RoomAttachmentItemResponse[] = rows.map((row) => {
    const sharedByName = [row.sharedByFirstName, row.sharedByLastName]
      .filter((part) => Boolean(part))
      .join(' ')
      .trim();
    const preview = this.buildAttachmentPreview({
      attachmentType: row.attachmentType,
      fileUrl: row.fileUrl,
      fileName: row.fileName,
      mimeType: row.mimeType,
      previewDocumentType: row.documentType,
      previewStatus: row.previewStatus,
      previewThumbnailUrl: row.thumbnailUrl,
      previewUrl: row.previewUrl,
      previewWidth: row.previewWidth,
      previewHeight: row.previewHeight,
      previewPage: row.previewPage,
      pageCount: row.pageCount,
      previewErrorCode: row.previewErrorCode,
      previewUpdatedAt: row.previewUpdatedAt,
    });
    const previewUpdatedAt =
      preview.previewUpdatedAt ||
      (preview.previewStatus === 'ready' || preview.previewStatus === 'failed'
        ? row.createdAt
        : undefined);
    const previewAssetSource = this.resolveAttachmentPreviewAssetSource({
      attachmentType: row.attachmentType,
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
      fileUrl: row.fileUrl,
      previewUrl: preview.previewUrl,
    });
    const downloadUrl = buildAttachmentDownloadUrl(row.fileUrl);

    return {
      attachmentId: row.attachmentId,
      roomId,
      messageId: row.messageId,
      attachmentType: row.attachmentType,
      fileName: row.fileName,
      fileUrl: row.fileUrl,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      checksum: row.checksum,
      width: row.width,
      height: row.height,
      durationMs: row.durationMs,
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
      sharedByUserId: row.sharedByUserId,
      sharedByName: sharedByName || row.sharedByEmail,
      sharedByEmail: row.sharedByEmail,
      messageSentAt: row.messageSentAt,
      createdAt: row.createdAt,
    };
  });

  const meta = PaginationHelper.buildMeta(total, query);
  return new PaginatedResponse(items, meta);
}
export async function listRoomMessages(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  query: ListRoomMessagesQueryRequest,
): Promise<RoomMessageResponse[]> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const qb = this.buildRoomMessageQuery({
    organizationId,
    roomId,
    includeDeleted: true,
  });

  if (query.beforeSentAt) {
    qb.andWhere('m.sent_at < :beforeSentAt', {
      beforeSentAt: new Date(query.beforeSentAt),
    });
  }

  const rows = await qb
    .orderBy('m.sent_at', 'DESC')
    .addOrderBy('m.id', 'DESC')
    .limit(query.limit || 30)
    .getRawMany();

  const items = rows
    .reverse()
    .map((row) => this.toRoomMessageResponseFromRawRow(row));
  return this.enrichRoomMessages({
    organizationId,
    userId,
    messages: items,
    resolveInternalLinkPreviews: false,
  });
}
export async function listRoomMessagesByCursor(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  query: ListRoomMessagesCursorQueryRequest,
): Promise<ListRoomMessagesCursorResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const limit = query.limit || 30;
  const startedAt = Date.now();
  const qb = this.buildRoomMessageQuery({
    organizationId,
    roomId,
    includeDeleted: true,
  });

  const decodedCursor = this.decodeRoomMessageCursor(query.cursor);
  if (query.cursor && !decodedCursor) {
    throw new BadRequestException('Invalid cursor');
  }
  if (decodedCursor) {
    qb.andWhere(
      '(m.sent_at < :cursorSentAt OR (m.sent_at = :cursorSentAt AND m.id < :cursorId))',
      {
        cursorSentAt: decodedCursor.sentAt,
        cursorId: decodedCursor.id,
      },
    );
  }

  const rows = await qb
    .orderBy('m.sent_at', 'DESC')
    .addOrderBy('m.id', 'DESC')
    .limit(limit + 1)
    .getRawMany();

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = pageRows
    .reverse()
    .map((row) => this.toRoomMessageResponseFromRawRow(row));
  const enrichedItems = await this.enrichRoomMessages({
    organizationId,
    userId,
    messages: items,
    resolveInternalLinkPreviews: false,
  });

  const oldest = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && oldest
      ? this.encodeRoomMessageCursor({
          sentAt: oldest.sentAt,
          id: oldest.id,
        })
      : undefined;

  const durationMs = Date.now() - startedAt;
  if (durationMs > 800) {
    this.logger.warn(
      `Slow cursor pagination query detected: roomId=${roomId}, durationMs=${durationMs}, limit=${limit}`,
    );
  }

  return {
    items: enrichedItems,
    hasMore,
    nextCursor,
  };
}
