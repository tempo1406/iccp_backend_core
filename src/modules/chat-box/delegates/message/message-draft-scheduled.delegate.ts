/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import { CreateScheduledMessageRequest } from '@modules/chat-box/message-management/dto/request/create-scheduled-message.request';
import { GetCurrentDraftQueryRequest } from '@modules/chat-box/message-management/dto/request/get-current-draft-query.request';
import { ListMyDraftsQueryRequest } from '@modules/chat-box/message-management/dto/request/list-my-drafts-query.request';
import { ListMyScheduledMessagesQueryRequest } from '@modules/chat-box/message-management/dto/request/list-my-scheduled-messages-query.request';
import { UpdateScheduledMessageRequest } from '@modules/chat-box/message-management/dto/request/update-scheduled-message.request';
import { UpsertCurrentDraftRequest } from '@modules/chat-box/message-management/dto/request/upsert-current-draft.request';
import { ChatDraftListResponse } from '@modules/chat-box/message-management/dto/response/chat-draft-list.response';
import { ChatDraftResponse } from '@modules/chat-box/message-management/dto/response/chat-draft.response';
import { DeleteDraftResponse } from '@modules/chat-box/message-management/dto/response/delete-draft.response';
import { DeleteScheduledMessageResponse } from '@modules/chat-box/message-management/dto/response/delete-scheduled-message.response';
import { ScheduledMessageCancelToDraftResponse } from '@modules/chat-box/message-management/dto/response/scheduled-message-cancel-to-draft.response';
import { ScheduledMessageListResponse } from '@modules/chat-box/message-management/dto/response/scheduled-message-list.response';
import { ScheduledMessageResponse } from '@modules/chat-box/message-management/dto/response/scheduled-message.response';
import { ScheduledMessageSendNowResponse } from '@modules/chat-box/message-management/dto/response/scheduled-message-send-now.response';
import { UpsertCurrentDraftResponse } from '@modules/chat-box/message-management/dto/response/upsert-current-draft.response';
import {
  ChatMessageDraft,
  ChatMessageDraftSource,
} from '@modules/chat-box/message-management/entities/message-draft.entity';
import {
  ChatScheduledMessage,
  ChatScheduledMessageStatus,
} from '@modules/chat-box/message-management/entities/scheduled-message.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  assertRoomDraftAccess,
  assertRoomScheduleAccess,
  assertScheduledTimeWindow,
  buildScheduledLocalTime,
  clampListLimit,
  decodeDraftCursor,
  decodeScheduledMessageCursor,
  deleteDraftByContextFromRepo,
  dispatchScheduledMessageInternal,
  encodeDraftCursor,
  encodeScheduledMessageCursor,
  findDraftByContextFromRepo,
  isDraftPayloadEmpty,
  normalizeDraftContent,
  normalizeMetadata,
  normalizeRichContent,
  normalizeTimezone,
  parseScheduledDateToUtc,
  resolveComposerContext,
  toChatDraftResponse,
  toScheduledMessageResponse,
  upsertDraftByContextInRepo,
} from './message-draft-scheduled-helpers.delegate';
import { ChatBoxServiceDelegateContext } from './message-delegate.types';
import {
  normalizeMessageRichPayload,
  resolveMessageContentFormatByRichContent,
} from './message-rich-content.helper';
export async function upsertCurrentDraft(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  dto: UpsertCurrentDraftRequest,
): Promise<UpsertCurrentDraftResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  await assertRoomDraftAccess.call(this, organizationId, roomId, userId);

  const composerContext = await resolveComposerContext.call(this, {
    organizationId,
    roomId,
    parentMessageId: dto.parentMessageId,
    threadRootMessageId: dto.threadRootMessageId,
  });

  const normalizedPayload = normalizeMessageRichPayload({
    content: dto.content,
    richContent: dto.richContent,
    contentFormat: dto.contentFormat,
  });
  const normalizedContent = normalizedPayload.content;
  const normalizedRichContent = normalizedPayload.richContent;
  const normalizedMetadata = normalizeMetadata(dto.metadata);

  if (
    isDraftPayloadEmpty({
      content: normalizedContent,
      richContent: normalizedRichContent,
      metadata: normalizedMetadata,
    })
  ) {
    const deleted = await deleteDraftByContextFromRepo({
      repo: this.draftRepo,
      organizationId,
      roomId,
      authorUserId: userId,
      threadRootMessageId: composerContext.threadRootMessageId,
      parentMessageId: composerContext.parentMessageId,
    });
    return {
      updated: deleted,
      draftDeleted: true,
    };
  }

  const draft = await upsertDraftByContextInRepo({
    repo: this.draftRepo,
    organizationId,
    roomId,
    authorUserId: userId,
    threadRootMessageId: composerContext.threadRootMessageId,
    parentMessageId: composerContext.parentMessageId,
    content: normalizedContent,
    richContent: normalizedRichContent,
    metadata: normalizedMetadata,
    draftSource: dto.draftSource ?? ChatMessageDraftSource.COMPOSER_AUTOSAVE,
  });

  return {
    updated: true,
    draftDeleted: false,
    draft: toChatDraftResponse(draft),
  };
}

export async function getCurrentDraft(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  query: GetCurrentDraftQueryRequest,
): Promise<ChatDraftResponse | null> {
  await this.assertActiveOrgMember(organizationId, userId);
  await assertRoomDraftAccess.call(this, organizationId, roomId, userId);

  const composerContext = await resolveComposerContext.call(this, {
    organizationId,
    roomId,
    parentMessageId: query.parentMessageId,
    threadRootMessageId: query.threadRootMessageId,
  });

  const draft = await findDraftByContextFromRepo({
    repo: this.draftRepo,
    organizationId,
    roomId,
    authorUserId: userId,
    threadRootMessageId: composerContext.threadRootMessageId,
    parentMessageId: composerContext.parentMessageId,
  });
  return draft ? toChatDraftResponse(draft) : null;
}

export async function listMyDrafts(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  query: ListMyDraftsQueryRequest,
): Promise<ChatDraftListResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const limit = clampListLimit(
    query.limit,
    this.constructor.DRAFT_LIST_MAX_LIMIT,
    20,
  );
  const cursor = decodeDraftCursor(query.cursor);

  const qb = this.draftRepo
    .createQueryBuilder('draft')
    .where('draft.organizationId = :organizationId', { organizationId })
    .andWhere('draft.authorUserId = :authorUserId', { authorUserId: userId });

  if (query.roomId) {
    qb.andWhere('draft.roomId = :roomId', { roomId: query.roomId });
  }

  if (cursor) {
    qb.andWhere(
      '(draft.updatedAt < :cursorUpdatedAt OR (draft.updatedAt = :cursorUpdatedAt AND draft.id < :cursorId))',
      {
        cursorUpdatedAt: cursor.updatedAt,
        cursorId: cursor.id,
      },
    );
  }

  const rows = await qb
    .orderBy('draft.updatedAt', 'DESC')
    .addOrderBy('draft.id', 'DESC')
    .take(limit + 1)
    .getMany();

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toChatDraftResponse);
  const nextCursor = hasMore
    ? encodeDraftCursor({
        updatedAt: items[items.length - 1].updatedAt.toISOString(),
        id: items[items.length - 1].id,
      })
    : undefined;

  return { items, nextCursor };
}

export async function deleteDraft(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  draftId: string,
  userId: string,
): Promise<DeleteDraftResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const draft = await this.draftRepo.findOne({
    where: {
      id: draftId,
      organizationId,
      authorUserId: userId,
    },
  });
  if (!draft) {
    return {
      draftId,
      deleted: false,
    };
  }

  await this.draftRepo.remove(draft);
  return {
    draftId,
    deleted: true,
  };
}

export async function createScheduledMessage(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  dto: CreateScheduledMessageRequest,
): Promise<ScheduledMessageResponse> {
  await this.assertActiveOrgMember(organizationId, userId);
  await assertRoomScheduleAccess.call(this, organizationId, roomId, userId);

  const composerContext = await resolveComposerContext.call(this, {
    organizationId,
    roomId,
    parentMessageId: dto.parentMessageId,
    threadRootMessageId: dto.threadRootMessageId,
  });

  const normalizedPayload = normalizeMessageRichPayload({
    content: dto.content,
    richContent: dto.richContent,
    contentFormat: dto.contentFormat,
    requireContent: true,
  });
  const content = normalizedPayload.content;
  const richContent = normalizedPayload.richContent;
  const metadata = normalizeMetadata(dto.metadata);

  const scheduledForUtc = parseScheduledDateToUtc(dto.scheduledFor);
  const timezone = normalizeTimezone(dto.timezone);
  assertScheduledTimeWindow.call(this, scheduledForUtc);
  const localTime = buildScheduledLocalTime(scheduledForUtc, timezone);

  const scheduled = this.scheduledMessageRepo.create({
    organizationId,
    roomId,
    authorUserId: userId,
    threadRootMessageId: composerContext.threadRootMessageId,
    parentMessageId: composerContext.parentMessageId,
    content,
    richContent,
    metadata,
    scheduledForUtc,
    scheduledTimezone: timezone,
    scheduledLocalDate: localTime.localDate,
    scheduledLocalTime: localTime.localTime,
    status: ChatScheduledMessageStatus.PENDING,
    sourceDraftId: dto.sourceDraftId,
  });
  const saved = await this.scheduledMessageRepo.save(scheduled);
  try {
    await this.chatBackgroundQueueService.enqueueScheduledMessageJob({
      organizationId,
      scheduledMessageId: saved.id,
      authorUserId: userId,
      runAfter: saved.scheduledForUtc.getTime(),
    });
  } catch (error) {
    this.logger.warn(
      `Failed to enqueue scheduled message job ${saved.id}: ${(error as Error).message}`,
    );
  }

  if (dto.sourceDraftId) {
    await this.draftRepo.delete({
      id: dto.sourceDraftId,
      organizationId,
      authorUserId: userId,
      roomId,
    });
  }

  return toScheduledMessageResponse(saved);
}

export async function listMyScheduledMessages(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  query: ListMyScheduledMessagesQueryRequest,
): Promise<ScheduledMessageListResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const limit = clampListLimit(
    query.limit,
    this.constructor.SCHEDULED_LIST_MAX_LIMIT,
    20,
  );
  const status = query.status ?? ChatScheduledMessageStatus.PENDING;
  const cursor = decodeScheduledMessageCursor(query.cursor);

  const qb = this.scheduledMessageRepo
    .createQueryBuilder('scheduled')
    .where('scheduled.organizationId = :organizationId', { organizationId })
    .andWhere('scheduled.authorUserId = :authorUserId', {
      authorUserId: userId,
    })
    .andWhere('scheduled.status = :status', { status });

  if (cursor) {
    qb.andWhere(
      '(scheduled.scheduledForUtc > :cursorScheduledForUtc OR (scheduled.scheduledForUtc = :cursorScheduledForUtc AND scheduled.id > :cursorId))',
      {
        cursorScheduledForUtc: cursor.scheduledForUtc,
        cursorId: cursor.id,
      },
    );
  }

  const rows = await qb
    .orderBy('scheduled.scheduledForUtc', 'ASC')
    .addOrderBy('scheduled.id', 'ASC')
    .take(limit + 1)
    .getMany();

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toScheduledMessageResponse);
  const nextCursor = hasMore
    ? encodeScheduledMessageCursor({
        scheduledForUtc: items[items.length - 1].scheduledForUtc.toISOString(),
        id: items[items.length - 1].id,
      })
    : undefined;

  return { items, nextCursor };
}

export async function updateScheduledMessage(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  scheduledMessageId: string,
  userId: string,
  dto: UpdateScheduledMessageRequest,
): Promise<ScheduledMessageResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const scheduled = await this.scheduledMessageRepo.findOne({
    where: {
      id: scheduledMessageId,
      organizationId,
      authorUserId: userId,
    },
  });
  if (!scheduled) {
    throw new NotFoundException('Scheduled message not found');
  }

  if (
    ![
      ChatScheduledMessageStatus.PENDING,
      ChatScheduledMessageStatus.FAILED,
    ].includes(scheduled.status)
  ) {
    throw new BadRequestException(
      'Only pending or failed scheduled messages can be updated',
    );
  }

  const hasContentUpdate = Object.prototype.hasOwnProperty.call(dto, 'content');
  const hasRichContentUpdate = Object.prototype.hasOwnProperty.call(
    dto,
    'richContent',
  );
  const hasContentFormatUpdate = Object.prototype.hasOwnProperty.call(
    dto,
    'contentFormat',
  );
  const hasMetadataUpdate = Object.prototype.hasOwnProperty.call(
    dto,
    'metadata',
  );
  const hasTimeUpdate = !!dto.scheduledFor || !!dto.timezone;

  if (
    !hasContentUpdate &&
    !hasRichContentUpdate &&
    !hasContentFormatUpdate &&
    !hasMetadataUpdate &&
    !hasTimeUpdate
  ) {
    throw new BadRequestException('At least one field must be updated');
  }

  const normalizedPayload =
    hasContentUpdate || hasRichContentUpdate || hasContentFormatUpdate
      ? normalizeMessageRichPayload({
          content: hasContentUpdate ? dto.content : scheduled.content,
          richContent: hasRichContentUpdate
            ? dto.richContent
            : hasContentUpdate && !hasContentFormatUpdate
              ? undefined
              : hasContentFormatUpdate &&
                  dto.contentFormat === ChatMessageContentFormat.PLAIN_TEXT
                ? undefined
                : scheduled.richContent,
          contentFormat: hasContentFormatUpdate
            ? dto.contentFormat
            : hasRichContentUpdate
              ? undefined
              : hasContentUpdate
                ? ChatMessageContentFormat.PLAIN_TEXT
                : resolveMessageContentFormatByRichContent(
                    scheduled.richContent,
                  ),
          requireContent: true,
        })
      : {
          content: scheduled.content,
          richContent: scheduled.richContent,
          contentFormat: resolveMessageContentFormatByRichContent(
            scheduled.richContent,
          ),
        };
  const content = normalizedPayload.content;
  const richContent = normalizedPayload.richContent;
  const metadata = hasMetadataUpdate
    ? normalizeMetadata(dto.metadata)
    : scheduled.metadata;

  const nextScheduledForUtc = dto.scheduledFor
    ? parseScheduledDateToUtc(dto.scheduledFor)
    : scheduled.scheduledForUtc;
  const nextTimezone = dto.timezone
    ? normalizeTimezone(dto.timezone)
    : scheduled.scheduledTimezone;
  assertScheduledTimeWindow.call(this, nextScheduledForUtc);
  const localTime = buildScheduledLocalTime(nextScheduledForUtc, nextTimezone);

  scheduled.content = content;
  scheduled.richContent = richContent;
  scheduled.metadata = metadata;
  scheduled.scheduledForUtc = nextScheduledForUtc;
  scheduled.scheduledTimezone = nextTimezone;
  scheduled.scheduledLocalDate = localTime.localDate;
  scheduled.scheduledLocalTime = localTime.localTime;
  scheduled.status = ChatScheduledMessageStatus.PENDING;
  scheduled.lastErrorCode = undefined;
  scheduled.lastErrorMessage = undefined;
  scheduled.cancelledAt = undefined;

  const saved = await this.scheduledMessageRepo.save(scheduled);
  try {
    await this.chatBackgroundQueueService.enqueueScheduledMessageJob({
      organizationId,
      scheduledMessageId: saved.id,
      authorUserId: userId,
      runAfter: saved.scheduledForUtc.getTime(),
    });
  } catch (error) {
    this.logger.warn(
      `Failed to re-enqueue scheduled message job ${saved.id}: ${(error as Error).message}`,
    );
  }
  return toScheduledMessageResponse(saved);
}

export async function cancelScheduledMessageToDraft(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  scheduledMessageId: string,
  userId: string,
): Promise<ScheduledMessageCancelToDraftResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const scheduled = await this.scheduledMessageRepo.findOne({
    where: {
      id: scheduledMessageId,
      organizationId,
      authorUserId: userId,
    },
  });
  if (!scheduled) {
    throw new NotFoundException('Scheduled message not found');
  }
  if (
    ![
      ChatScheduledMessageStatus.PENDING,
      ChatScheduledMessageStatus.FAILED,
    ].includes(scheduled.status)
  ) {
    throw new BadRequestException(
      'Only pending or failed scheduled messages can be cancelled to draft',
    );
  }

  const result = await this.dataSource.transaction(async (manager) => {
    const scheduledRepo = manager.getRepository(ChatScheduledMessage);
    const draftRepo = manager.getRepository(ChatMessageDraft);

    const currentScheduled = await scheduledRepo.findOne({
      where: {
        id: scheduledMessageId,
        organizationId,
        authorUserId: userId,
      },
    });
    if (!currentScheduled) {
      throw new NotFoundException('Scheduled message not found');
    }
    if (
      ![
        ChatScheduledMessageStatus.PENDING,
        ChatScheduledMessageStatus.FAILED,
      ].includes(currentScheduled.status)
    ) {
      throw new BadRequestException(
        'Only pending or failed scheduled messages can be cancelled to draft',
      );
    }

    currentScheduled.status = ChatScheduledMessageStatus.CONVERTED_TO_DRAFT;
    currentScheduled.cancelledAt = new Date();
    currentScheduled.lastErrorCode = undefined;
    currentScheduled.lastErrorMessage = undefined;
    const savedScheduled = await scheduledRepo.save(currentScheduled);

    const draft = await upsertDraftByContextInRepo({
      repo: draftRepo,
      organizationId,
      roomId: currentScheduled.roomId,
      authorUserId: currentScheduled.authorUserId,
      threadRootMessageId: currentScheduled.threadRootMessageId,
      parentMessageId: currentScheduled.parentMessageId,
      content: normalizeDraftContent(currentScheduled.content),
      richContent: normalizeRichContent(currentScheduled.richContent),
      metadata: normalizeMetadata(currentScheduled.metadata),
      draftSource: ChatMessageDraftSource.CANCELLED_SCHEDULE,
    });

    return { scheduled: savedScheduled, draft };
  });
  await this.chatBackgroundQueueService.removeScheduledMessageJob(
    result.scheduled.id,
  );

  return {
    scheduledMessage: toScheduledMessageResponse(result.scheduled),
    draft: toChatDraftResponse(result.draft),
  };
}

export async function sendScheduledMessageNow(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  scheduledMessageId: string,
  userId: string,
): Promise<ScheduledMessageSendNowResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const existing = await this.scheduledMessageRepo.findOne({
    where: {
      id: scheduledMessageId,
      organizationId,
      authorUserId: userId,
    },
  });
  if (!existing) {
    throw new NotFoundException('Scheduled message not found');
  }
  if (
    ![
      ChatScheduledMessageStatus.PENDING,
      ChatScheduledMessageStatus.FAILED,
    ].includes(existing.status)
  ) {
    throw new BadRequestException(
      'Only pending or failed scheduled messages can be sent now',
    );
  }

  const dispatchResult = await dispatchScheduledMessageInternal.call(this, {
    organizationId,
    scheduledMessageId,
    authorUserId: userId,
    allowedStatuses: [
      ChatScheduledMessageStatus.PENDING,
      ChatScheduledMessageStatus.FAILED,
    ],
  });

  if (!dispatchResult.scheduledMessage) {
    throw new NotFoundException('Scheduled message not found');
  }
  if (!dispatchResult.sentMessage) {
    throw new BadRequestException(
      dispatchResult.scheduledMessage.lastErrorMessage ||
        'Failed to send scheduled message',
    );
  }
  await this.chatBackgroundQueueService.removeScheduledMessageJob(
    scheduledMessageId,
  );

  return {
    scheduledMessage: toScheduledMessageResponse(
      dispatchResult.scheduledMessage,
    ),
    sentMessage: dispatchResult.sentMessage,
  };
}

export async function deleteScheduledMessage(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  scheduledMessageId: string,
  userId: string,
): Promise<DeleteScheduledMessageResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const scheduled = await this.scheduledMessageRepo.findOne({
    where: {
      id: scheduledMessageId,
      organizationId,
      authorUserId: userId,
    },
  });
  if (!scheduled) {
    return {
      scheduledMessageId,
      deleted: false,
    };
  }

  if (scheduled.status === ChatScheduledMessageStatus.SENT) {
    throw new BadRequestException(
      'Cannot delete an already sent scheduled message',
    );
  }
  if (scheduled.status === ChatScheduledMessageStatus.PROCESSING) {
    throw new BadRequestException('Scheduled message is being processed now');
  }
  if (
    [
      ChatScheduledMessageStatus.CANCELLED,
      ChatScheduledMessageStatus.CONVERTED_TO_DRAFT,
    ].includes(scheduled.status)
  ) {
    return {
      scheduledMessageId,
      deleted: false,
    };
  }

  scheduled.status = ChatScheduledMessageStatus.CANCELLED;
  scheduled.cancelledAt = new Date();
  scheduled.lastErrorCode = undefined;
  scheduled.lastErrorMessage = undefined;
  await this.scheduledMessageRepo.save(scheduled);
  await this.chatBackgroundQueueService.removeScheduledMessageJob(
    scheduledMessageId,
  );

  return {
    scheduledMessageId,
    deleted: true,
  };
}

export async function processScheduledMessageQueue(
  this: ChatBoxServiceDelegateContext,
): Promise<void> {
  if (this.scheduledMessageWorkerBusy) {
    return;
  }

  this.scheduledMessageWorkerBusy = true;
  try {
    const now = Date.now();
    if (
      now - this.scheduledQueueLastHydratedAt >=
      this.constructor.SCHEDULED_QUEUE_HYDRATE_INTERVAL_MS
    ) {
      this.scheduledQueueLastHydratedAt = now;
      const dueItems = await this.scheduledMessageRepo
        .createQueryBuilder('scheduled')
        .where('scheduled.status = :status', {
          status: ChatScheduledMessageStatus.PENDING,
        })
        .andWhere('scheduled.scheduledForUtc <= :now', { now: new Date(now) })
        .orderBy('scheduled.scheduledForUtc', 'ASC')
        .addOrderBy('scheduled.id', 'ASC')
        .take(this.constructor.SCHEDULED_QUEUE_HYDRATE_BATCH_SIZE)
        .getMany();

      for (const item of dueItems) {
        await this.chatBackgroundQueueService.enqueueScheduledMessageJob({
          organizationId: item.organizationId,
          scheduledMessageId: item.id,
          authorUserId: item.authorUserId,
          runAfter: item.scheduledForUtc.getTime(),
        });
      }
    }

    const claimedJobs =
      await this.chatBackgroundQueueService.claimDueScheduledMessageJobs({
        limit: this.constructor.SCHEDULED_MESSAGE_WORKER_BATCH_SIZE,
        lockTtlMs: this.constructor.SCHEDULED_MESSAGE_QUEUE_JOB_LOCK_TTL_MS,
      });
    for (const claimed of claimedJobs) {
      try {
        await dispatchScheduledMessageInternal.call(this, {
          organizationId: claimed.job.organizationId,
          scheduledMessageId: claimed.job.scheduledMessageId,
          authorUserId: claimed.job.authorUserId,
          allowedStatuses: [ChatScheduledMessageStatus.PENDING],
        });
      } catch (error) {
        await this.chatBackgroundQueueService.moveScheduledMessageToDeadLetter({
          job: claimed.job,
          reason:
            error instanceof Error && error.message
              ? error.message
              : 'scheduled_dispatch_failed',
        });
        this.logger.warn(
          `Failed to dispatch scheduled message ${claimed.job.scheduledMessageId}: ${(error as Error).message}`,
        );
      } finally {
        await this.chatBackgroundQueueService.releaseScheduledMessageClaim({
          scheduledMessageId: claimed.jobId,
          lockToken: claimed.lockToken,
        });
      }
    }
  } finally {
    this.scheduledMessageWorkerBusy = false;
  }
}
