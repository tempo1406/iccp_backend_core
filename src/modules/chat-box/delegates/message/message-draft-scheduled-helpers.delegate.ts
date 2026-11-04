/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { ChatDraftResponse } from '@modules/chat-box/message-management/dto/response/chat-draft.response';
import { RoomMessageResponse } from '@modules/chat-box/message-management/dto/response/room-message.response';
import { ScheduledMessageResponse } from '@modules/chat-box/message-management/dto/response/scheduled-message.response';
import {
  ChatMessageDraft,
  ChatMessageDraftSource,
} from '@modules/chat-box/message-management/entities/message-draft.entity';
import { ChatMessageType } from '@modules/chat-box/message-management/entities/message.entity';
import {
  ChatScheduledMessage,
  ChatScheduledMessageStatus,
} from '@modules/chat-box/message-management/entities/scheduled-message.entity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ChatBoxServiceDelegateContext } from './message-delegate.types';
import {
  normalizeMessageRichPayload,
  resolveMessageContentFormatByRichContent,
} from './message-rich-content.helper';

type DraftCursor = {
  updatedAt: string;
  id: string;
};

type ScheduledMessageCursor = {
  scheduledForUtc: string;
  id: string;
};

export async function assertRoomDraftAccess(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
): Promise<void> {
  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  if (!access.permissions.canSendMessage) {
    throw new ForbiddenException('You do not have permission to save draft');
  }
  if (access.room.isArchived) {
    throw new BadRequestException('Cannot save draft in archived room');
  }
}

export async function assertRoomScheduleAccess(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
): Promise<void> {
  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  if (!access.permissions.canSendMessage) {
    throw new ForbiddenException(
      'You do not have permission to schedule message in this room',
    );
  }
  if (access.room.isArchived) {
    throw new BadRequestException('Cannot schedule message in archived room');
  }
}

export async function resolveComposerContext(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    parentMessageId?: string;
    threadRootMessageId?: string;
  },
): Promise<{ parentMessageId?: string; threadRootMessageId?: string }> {
  let resolvedParentMessageId = params.parentMessageId;
  let resolvedThreadRootMessageId = params.threadRootMessageId;

  if (params.parentMessageId) {
    const parentMessage = await this.messageRepo.findOne({
      where: {
        id: params.parentMessageId,
        organizationId: params.organizationId,
        roomId: params.roomId,
        isDeleted: false,
      },
      select: ['id', 'threadRootMessageId'],
    });
    if (!parentMessage) {
      throw new NotFoundException('Parent message not found');
    }

    const inferredThreadRootMessageId =
      parentMessage.threadRootMessageId || parentMessage.id;

    if (
      params.threadRootMessageId &&
      params.threadRootMessageId !== inferredThreadRootMessageId
    ) {
      throw new BadRequestException(
        'parentMessageId does not belong to provided threadRootMessageId',
      );
    }

    resolvedParentMessageId = parentMessage.id;
    resolvedThreadRootMessageId = inferredThreadRootMessageId;
  }

  if (resolvedThreadRootMessageId) {
    const rootMessage = await this.messageRepo.findOne({
      where: {
        id: resolvedThreadRootMessageId,
        organizationId: params.organizationId,
        roomId: params.roomId,
        isDeleted: false,
      },
      select: ['id'],
    });
    if (!rootMessage) {
      throw new NotFoundException('Thread root message not found');
    }
  }

  return {
    parentMessageId: resolvedParentMessageId,
    threadRootMessageId: resolvedThreadRootMessageId,
  };
}

export function normalizeDraftContent(content?: string): string | undefined {
  if (typeof content !== 'string') {
    return undefined;
  }
  const trimmed = content.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeRichContent(
  richContent?: Record<string, any>,
): Record<string, any> | undefined {
  if (richContent === undefined || richContent === null) {
    return undefined;
  }
  if (!richContent || typeof richContent !== 'object') {
    return undefined;
  }
  if (Array.isArray(richContent)) {
    throw new BadRequestException('richContent must be an object');
  }
  if (Object.keys(richContent).length === 0) {
    return undefined;
  }
  return richContent;
}

export function normalizeMetadata(
  metadata?: Record<string, any>,
): Record<string, any> | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }
  if (Object.keys(metadata).length === 0) {
    return undefined;
  }
  return metadata;
}

export function isDraftPayloadEmpty(params: {
  content?: string;
  richContent?: Record<string, any>;
  metadata?: Record<string, any>;
}): boolean {
  return !params.content && !params.richContent && !params.metadata;
}

export async function findDraftByContextFromRepo(params: {
  repo: Repository<ChatMessageDraft>;
  organizationId: string;
  roomId: string;
  authorUserId: string;
  threadRootMessageId?: string;
  parentMessageId?: string;
}): Promise<ChatMessageDraft | null> {
  const qb = params.repo
    .createQueryBuilder('draft')
    .where('draft.organizationId = :organizationId', {
      organizationId: params.organizationId,
    })
    .andWhere('draft.roomId = :roomId', { roomId: params.roomId })
    .andWhere('draft.authorUserId = :authorUserId', {
      authorUserId: params.authorUserId,
    });

  if (params.threadRootMessageId) {
    qb.andWhere('draft.threadRootMessageId = :threadRootMessageId', {
      threadRootMessageId: params.threadRootMessageId,
    });
  } else {
    qb.andWhere('draft.threadRootMessageId IS NULL');
  }

  if (params.parentMessageId) {
    qb.andWhere('draft.parentMessageId = :parentMessageId', {
      parentMessageId: params.parentMessageId,
    });
  } else {
    qb.andWhere('draft.parentMessageId IS NULL');
  }

  return qb.getOne();
}

export async function upsertDraftByContextInRepo(params: {
  repo: Repository<ChatMessageDraft>;
  organizationId: string;
  roomId: string;
  authorUserId: string;
  threadRootMessageId?: string;
  parentMessageId?: string;
  content?: string;
  richContent?: Record<string, any>;
  metadata?: Record<string, any>;
  draftSource: ChatMessageDraftSource;
}): Promise<ChatMessageDraft> {
  const existing = await findDraftByContextFromRepo({
    repo: params.repo,
    organizationId: params.organizationId,
    roomId: params.roomId,
    authorUserId: params.authorUserId,
    threadRootMessageId: params.threadRootMessageId,
    parentMessageId: params.parentMessageId,
  });

  const now = new Date();
  if (!existing) {
    const created = params.repo.create({
      organizationId: params.organizationId,
      roomId: params.roomId,
      authorUserId: params.authorUserId,
      threadRootMessageId: params.threadRootMessageId,
      parentMessageId: params.parentMessageId,
      content: params.content,
      richContent: params.richContent,
      metadata: params.metadata,
      draftSource: params.draftSource,
      lastComposerActivityAt: now,
    });
    return params.repo.save(created);
  }

  existing.content = params.content;
  existing.richContent = params.richContent;
  existing.metadata = params.metadata;
  existing.draftSource = params.draftSource;
  existing.lastComposerActivityAt = now;
  return params.repo.save(existing);
}

export async function deleteDraftByContextFromRepo(params: {
  repo: Repository<ChatMessageDraft>;
  organizationId: string;
  roomId: string;
  authorUserId: string;
  threadRootMessageId?: string;
  parentMessageId?: string;
}): Promise<boolean> {
  const existing = await findDraftByContextFromRepo(params);
  if (!existing) {
    return false;
  }
  await params.repo.remove(existing);
  return true;
}

export function toChatDraftResponse(
  draft: ChatMessageDraft,
): ChatDraftResponse {
  return {
    id: draft.id,
    organizationId: draft.organizationId,
    roomId: draft.roomId,
    authorUserId: draft.authorUserId,
    threadRootMessageId: draft.threadRootMessageId,
    parentMessageId: draft.parentMessageId,
    content: draft.content,
    contentFormat: resolveMessageContentFormatByRichContent(draft.richContent),
    richContent: draft.richContent,
    metadata: draft.metadata,
    draftSource: draft.draftSource,
    lastComposerActivityAt: draft.lastComposerActivityAt,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

export function clampListLimit(
  inputLimit: number | undefined,
  maxLimit: number,
  defaultLimit: number,
): number {
  if (!inputLimit || Number.isNaN(inputLimit)) {
    return defaultLimit;
  }
  return Math.max(1, Math.min(maxLimit, Math.floor(inputLimit)));
}

export function encodeDraftCursor(cursor: DraftCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeDraftCursor(cursor?: string): DraftCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as DraftCursor;
    if (!parsed?.updatedAt || !parsed?.id) {
      return null;
    }
    const updatedAtDate = new Date(parsed.updatedAt);
    if (Number.isNaN(updatedAtDate.getTime())) {
      return null;
    }
    return {
      updatedAt: updatedAtDate.toISOString(),
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

export function encodeScheduledMessageCursor(
  cursor: ScheduledMessageCursor,
): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeScheduledMessageCursor(
  cursor?: string,
): ScheduledMessageCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as ScheduledMessageCursor;
    if (!parsed?.scheduledForUtc || !parsed?.id) {
      return null;
    }
    const scheduledForUtcDate = new Date(parsed.scheduledForUtc);
    if (Number.isNaN(scheduledForUtcDate.getTime())) {
      return null;
    }
    return {
      scheduledForUtc: scheduledForUtcDate.toISOString(),
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

export function parseScheduledDateToUtc(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(
      'scheduledFor must be a valid ISO-8601 datetime',
    );
  }
  return parsed;
}

export function normalizeTimezone(timezone: string): string {
  const normalized = (timezone || '').trim();
  if (!normalized) {
    throw new BadRequestException('timezone is required');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: normalized }).format(
      new Date(),
    );
  } catch {
    throw new BadRequestException('timezone must be a valid IANA timezone');
  }
  return normalized;
}

export function buildScheduledLocalTime(
  scheduledForUtc: Date,
  timezone: string,
): { localDate: string; localTime: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(scheduledForUtc);
  const partMap = new Map(parts.map((item) => [item.type, item.value]));

  const year = partMap.get('year');
  const month = partMap.get('month');
  const day = partMap.get('day');
  const hour = partMap.get('hour');
  const minute = partMap.get('minute');

  if (!year || !month || !day || !hour || !minute) {
    throw new BadRequestException('Cannot format scheduled local date/time');
  }

  return {
    localDate: `${year}-${month}-${day}`,
    localTime: `${hour}:${minute}`,
  };
}

export function assertScheduledTimeWindow(
  this: ChatBoxServiceDelegateContext,
  scheduledForUtc: Date,
): void {
  const now = Date.now();
  if (scheduledForUtc.getTime() <= now) {
    throw new BadRequestException('scheduledFor must be in the future');
  }

  const maxAheadMs =
    this.constructor.SCHEDULED_MAX_AHEAD_DAYS * 24 * 60 * 60 * 1000;
  if (scheduledForUtc.getTime() > now + maxAheadMs) {
    throw new BadRequestException(
      `scheduledFor cannot exceed ${this.constructor.SCHEDULED_MAX_AHEAD_DAYS} days in the future`,
    );
  }
}

export function toScheduledMessageResponse(
  scheduled: ChatScheduledMessage,
): ScheduledMessageResponse {
  return {
    id: scheduled.id,
    organizationId: scheduled.organizationId,
    roomId: scheduled.roomId,
    authorUserId: scheduled.authorUserId,
    threadRootMessageId: scheduled.threadRootMessageId,
    parentMessageId: scheduled.parentMessageId,
    content: scheduled.content,
    contentFormat: resolveMessageContentFormatByRichContent(
      scheduled.richContent,
    ),
    richContent: scheduled.richContent,
    metadata: scheduled.metadata,
    scheduledForUtc: scheduled.scheduledForUtc,
    scheduledTimezone: scheduled.scheduledTimezone,
    scheduledLocalDate: scheduled.scheduledLocalDate,
    scheduledLocalTime: scheduled.scheduledLocalTime,
    status: scheduled.status,
    sourceDraftId: scheduled.sourceDraftId,
    sentMessageId: scheduled.sentMessageId,
    lastErrorCode: scheduled.lastErrorCode,
    lastErrorMessage: scheduled.lastErrorMessage,
    sentAt: scheduled.sentAt,
    cancelledAt: scheduled.cancelledAt,
    createdAt: scheduled.createdAt,
    updatedAt: scheduled.updatedAt,
  };
}

type DispatchScheduledMessageInternalParams = {
  organizationId: string;
  scheduledMessageId: string;
  authorUserId: string;
  allowedStatuses: ChatScheduledMessageStatus[];
};

export async function dispatchScheduledMessageInternal(
  this: ChatBoxServiceDelegateContext,
  params: DispatchScheduledMessageInternalParams,
): Promise<{
  scheduledMessage: ChatScheduledMessage | null;
  sentMessage?: RoomMessageResponse;
}> {
  const claimed = await this.dataSource.transaction(async (manager) => {
    const scheduledRepo = manager.getRepository(ChatScheduledMessage);
    const existing = await scheduledRepo
      .createQueryBuilder('scheduled')
      .setLock('pessimistic_write')
      .where('scheduled.id = :scheduledMessageId', {
        scheduledMessageId: params.scheduledMessageId,
      })
      .andWhere('scheduled.organizationId = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('scheduled.authorUserId = :authorUserId', {
        authorUserId: params.authorUserId,
      })
      .getOne();
    if (!existing) {
      return null;
    }
    if (!params.allowedStatuses.includes(existing.status)) {
      return existing;
    }

    existing.status = ChatScheduledMessageStatus.PROCESSING;
    existing.lastErrorCode = undefined;
    existing.lastErrorMessage = undefined;
    existing.cancelledAt = undefined;
    return scheduledRepo.save(existing);
  });

  if (!claimed) {
    return { scheduledMessage: null };
  }
  if (claimed.status !== ChatScheduledMessageStatus.PROCESSING) {
    return { scheduledMessage: claimed };
  }

  try {
    const metadata = mergeScheduledDispatchMetadata({
      metadata: claimed.metadata,
    });
    const normalizedPayload = normalizeMessageRichPayload({
      content: claimed.content,
      richContent: normalizeRichContent(claimed.richContent),
      contentFormat: resolveMessageContentFormatByRichContent(
        claimed.richContent,
      ),
      requireContent: true,
    });
    const sentMessage = await this.sendMessage(
      claimed.organizationId,
      claimed.roomId,
      claimed.authorUserId,
      {
        content: normalizedPayload.content,
        contentFormat: normalizedPayload.contentFormat,
        richContent: normalizedPayload.richContent,
        messageType: ChatMessageType.TEXT,
        metadata,
        parentMessageId: claimed.parentMessageId,
      },
    );

    claimed.status = ChatScheduledMessageStatus.SENT;
    claimed.sentMessageId = sentMessage.id;
    claimed.sentAt = new Date();
    claimed.lastErrorCode = undefined;
    claimed.lastErrorMessage = undefined;
    const saved = await this.scheduledMessageRepo.save(claimed);
    return {
      scheduledMessage: saved,
      sentMessage,
    };
  } catch (error) {
    claimed.status = ChatScheduledMessageStatus.FAILED;
    claimed.lastErrorCode = 'scheduled_message_dispatch_failed';
    claimed.lastErrorMessage = resolveScheduledDispatchError(error);
    const saved = await this.scheduledMessageRepo.save(claimed);
    return { scheduledMessage: saved };
  }
}

export function mergeScheduledDispatchMetadata(params: {
  metadata?: Record<string, any>;
}): Record<string, any> | undefined {
  const metadata = normalizeMetadata(params.metadata);
  if (!metadata) {
    return undefined;
  }
  return metadata;
}

export function resolveScheduledDispatchError(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return 'Failed to dispatch scheduled message';
}
