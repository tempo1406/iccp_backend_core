/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  CHAT_BOX_EVENTS,
  ChatMessageDomainEvent,
} from '@modules/chat-box/delegates/constants/chat-box-events.constant';
import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import { ForwardMessageRequest } from '@modules/chat-box/message-management/dto/request/forward-message.request';
import { SendMessageRequest } from '@modules/chat-box/message-management/dto/request/send-message.request';
import { UpdateMessageRequest } from '@modules/chat-box/message-management/dto/request/update-message.request';
import {
  ForwardMessageResponse,
  ForwardMessageTargetResultResponse,
} from '@modules/chat-box/message-management/dto/response/forward-message.response';
import { LinkPreviewResponse } from '@modules/chat-box/message-management/dto/response/link-preview.response';
import { RoomMessageResponse } from '@modules/chat-box/message-management/dto/response/room-message.response';
import {
  ChatMentionType,
  ChatMessageMention,
} from '@modules/chat-box/message-management/entities/message-mention.entity';
import {
  ChatMessage,
  ChatMessageType,
} from '@modules/chat-box/message-management/entities/message.entity';
import {
  ChatNotifyLevel,
  ChatRoomMember,
} from '@modules/chat-box/room-management/entities/room-member.entity';
import { ChatRoomType } from '@modules/chat-box/room-management/entities/room.entity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { ChatBoxServiceDelegateContext } from './message-delegate.types';
import {
  normalizeMessageRichPayload,
  resolveMessageContentFormatByRichContent,
} from './message-rich-content.helper';

function stripInternalLinkPreviewSnapshots(
  message: RoomMessageResponse,
): RoomMessageResponse {
  if (
    !Array.isArray(message.linkPreviews) ||
    message.linkPreviews.length === 0
  ) {
    return message;
  }

  const sanitizedLinkPreviews: LinkPreviewResponse[] = message.linkPreviews.map(
    (preview) => {
      const reference = preview.internalReference;
      if (reference?.kind !== 'team_chat_message') {
        return preview;
      }
      return {
        ...preview,
        internalReference: {
          kind: reference.kind,
          roomId: reference.roomId,
          messageId: reference.messageId,
          deepLinkUrl: reference.deepLinkUrl,
        },
      };
    },
  );

  return {
    ...message,
    linkPreviews: sanitizedLinkPreviews,
  };
}

function buildLastMessageSnippet(
  message: Pick<RoomMessageResponse, 'content' | 'messageType' | 'isDeleted'>,
): string {
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
}

function emitMessageUpdatedRealtimeEvent(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    actorUserId: string;
    message: RoomMessageResponse;
    roomDelta?: ChatMessageDomainEvent['roomDelta'];
  },
): void {
  const event: ChatMessageDomainEvent = {
    organizationId: params.organizationId,
    roomId: params.roomId,
    actorUserId: params.actorUserId,
    message: stripInternalLinkPreviewSnapshots(params.message),
    roomDelta: params.roomDelta,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_UPDATED, event);
}

function tryEmitMessageUpdatedRealtimeEvent(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    actorUserId: string;
    message: RoomMessageResponse;
    roomDelta?: ChatMessageDomainEvent['roomDelta'];
  },
  reason: string,
): boolean {
  try {
    emitMessageUpdatedRealtimeEvent.call(this, params);
    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `Message updated parity emit failed: reason=${reason}, roomId=${params.roomId}, messageId=${params.message.id}, error=${errorMessage}`,
    );
    return false;
  }
}

export async function sendMessage(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  userId: string,
  dto: SendMessageRequest,
): Promise<RoomMessageResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  if (!access.permissions.canSendMessage) {
    throw new ForbiddenException('You do not have permission to send message');
  }
  if (access.room.isArchived) {
    throw new BadRequestException('Cannot send message to archived room');
  }

  const messageType = dto.messageType ?? ChatMessageType.TEXT;
  const allowEmptyForwardTextContent =
    messageType === ChatMessageType.TEXT && dto.metadata?.source === 'forward';
  const normalizedPayload = normalizeMessageRichPayload({
    content: dto.content,
    richContent: dto.richContent,
    contentFormat: dto.contentFormat,
    requireContent: messageType === ChatMessageType.TEXT,
    allowEmptyContent: allowEmptyForwardTextContent,
  });
  const content = normalizedPayload.content;

  const previewPlan = await this.buildLinkPreviewPlan({
    content,
    metadata: dto.metadata,
    eagerFetch: true,
  });

  let parentMessage: ChatMessage | null = null;
  if (dto.parentMessageId) {
    parentMessage = await this.messageRepo.findOne({
      where: {
        id: dto.parentMessageId,
        roomId,
        organizationId,
        isDeleted: false,
      },
    });
    if (!parentMessage) {
      throw new NotFoundException('Parent message not found');
    }
  }

  if (dto.clientMessageId) {
    const existing = await this.messageRepo.findOne({
      where: {
        organizationId,
        roomId,
        senderId: userId,
        clientMessageId: dto.clientMessageId,
      },
    });
    if (existing) {
      return this.getRoomMessageById({
        organizationId,
        roomId,
        messageId: existing.id,
        userId,
      });
    }
  }

  const mentionedUserIds = this.extractMentionedUserIds(dto.metadata);
  const specialMentionTypes = this.extractSpecialMentionTypes(dto.metadata);
  this.validateSpecialMentionTypesForRoom({
    roomType: access.room.roomType,
    specialMentionTypes,
  });

  const mentionTypeByUserId = new Map<string, ChatMentionType>();
  const directMentionTargetUserIds = mentionedUserIds.filter((id) => id !== userId);

  if (directMentionTargetUserIds.length > 0) {
    const activeDirectMentionMembers = (await this.roomMemberRepo.find({
      where: {
        organizationId,
        roomId,
        userId: In(directMentionTargetUserIds),
        isActive: true,
      },
      select: ['userId', 'notifyLevel', 'muteUntil', 'isActive'],
    })) as Array<
      Pick<ChatRoomMember, 'userId' | 'notifyLevel' | 'muteUntil' | 'isActive'>
    >;
    const activeDirectMentionUserSet = new Set(
      activeDirectMentionMembers.map((member) => member.userId),
    );
    const activeDirectMentionMemberMap = new Map(
      activeDirectMentionMembers.map((member) => [member.userId, member]),
    );
    const invalidMentionUserIds = directMentionTargetUserIds.filter(
      (id) => !activeDirectMentionUserSet.has(id),
    );

    if (invalidMentionUserIds.length > 0) {
      throw new BadRequestException(
        `mentionedUserIds must be active room members: ${invalidMentionUserIds.join(', ')}`,
      );
    }

    for (const mentionedUserId of directMentionTargetUserIds) {
      const member = activeDirectMentionMemberMap.get(mentionedUserId);
      if (!member) {
        continue;
      }
      if (
        this.shouldSkipMentionForNotifyLevel(
          member.notifyLevel as ChatNotifyLevel,
          member.muteUntil,
        )
      ) {
        continue;
      }
      mentionTypeByUserId.set(member.userId, ChatMentionType.USER);
    }
  }

  if (specialMentionTypes.length > 0) {
    const activeRoomMembers = (await this.roomMemberRepo.find({
      where: {
        organizationId,
        roomId,
        isActive: true,
      },
      select: ['userId', 'notifyLevel', 'muteUntil', 'isActive'],
    })) as Array<
      Pick<ChatRoomMember, 'userId' | 'notifyLevel' | 'muteUntil' | 'isActive'>
    >;

    const specialMentionType =
      access.room.roomType === ChatRoomType.CHANNEL
        ? ChatMentionType.CHANNEL
        : ChatMentionType.GROUP;

    for (const member of activeRoomMembers) {
      if (member.userId === userId) {
        continue;
      }
      if (
        this.shouldSkipMentionForNotifyLevel(
          member.notifyLevel as ChatNotifyLevel,
          member.muteUntil,
        )
      ) {
        continue;
      }
      if (!mentionTypeByUserId.has(member.userId)) {
        mentionTypeByUserId.set(member.userId, specialMentionType);
      }
    }
  }

  const canonicalMentionedUserIds = Array.from(mentionTypeByUserId.keys());
  const canonicalMetadata = this.withCanonicalMentionMetadata({
    metadata: previewPlan.metadata,
    mentionedUserIds: canonicalMentionedUserIds,
    specialMentionTypes,
  });

  const message = await this.dataSource.transaction(async (manager) => {
    const newMessage = manager.create(ChatMessage, {
      organizationId,
      roomId,
      senderId: userId,
      messageType,
      content,
      richContent: normalizedPayload.richContent,
      parentMessageId: parentMessage?.id,
      threadRootMessageId: parentMessage
        ? parentMessage.threadRootMessageId || parentMessage.id
        : undefined,
      clientMessageId: dto.clientMessageId?.trim(),
      metadata: canonicalMetadata,
      sentAt: new Date(),
    });

    const savedMessage = await manager.save(newMessage);

    if (parentMessage) {
      await manager
        .createQueryBuilder()
        .update(ChatMessage)
        .set({ replyCount: () => '"reply_count" + 1' })
        .where('id = :id', { id: parentMessage.id })
        .execute();
    }

    if (mentionTypeByUserId.size > 0) {
      const mentionRows = Array.from(mentionTypeByUserId.entries()).map(
        ([mentionedUserId, mentionType]) =>
          manager.create(ChatMessageMention, {
            organizationId,
            messageId: savedMessage.id,
            mentionedUserId,
            mentionType,
            isRead: false,
          }),
      );

      if (mentionRows.length > 0) {
        await manager.save(mentionRows);
      }
    }

    access.room.lastMessageId = savedMessage.id;
    access.room.lastMessageAt = savedMessage.sentAt;
    await manager.save(access.room);

    return savedMessage;
  });

  const response = await this.getRoomMessageById({
    organizationId,
    roomId,
    messageId: message.id,
    userId,
  });
  const event: ChatMessageDomainEvent = {
    organizationId,
    roomId,
    actorUserId: userId,
    message: stripInternalLinkPreviewSnapshots(response),
    roomDelta: {
      roomId,
      reason: 'message_created',
      messageId: response.id,
      lastMessageId: response.id,
      lastMessageAt: response.sentAt,
      lastMessageSnippet: buildLastMessageSnippet(response),
      shouldRefreshRoomSummary: false,
    },
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_CREATED, event);

  if (previewPlan.pendingUrls.length > 0) {
    this.chatLinkPreviewService.enqueuePreviewJobs({
      organizationId,
      roomId,
      messageId: response.id,
      actorUserId: userId,
      urls: previewPlan.pendingUrls,
    });
  }

  return response;
}

export async function forwardMessage(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  sourceRoomId: string,
  sourceMessageId: string,
  userId: string,
  dto: ForwardMessageRequest,
): Promise<ForwardMessageResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const sourceAccess = await this.getRoomAccessForCaller(
    organizationId,
    sourceRoomId,
    userId,
  );
  if (!sourceAccess.permissions.canView) {
    throw new ForbiddenException(
      'You do not have permission to view source message',
    );
  }

  const sourceMessage = await this.messageRepo.findOne({
    where: {
      id: sourceMessageId,
      organizationId,
      roomId: sourceRoomId,
      isDeleted: false,
    },
  });
  if (!sourceMessage) {
    throw new NotFoundException('Source message not found');
  }

  const sourceAttachments = await this.attachmentRepo.find({
    where: { organizationId, messageId: sourceMessage.id },
    order: { createdAt: 'ASC' },
  });

  const uniqueTargetRoomIds = Array.from(new Set(dto.targetRoomIds || []));
  if (uniqueTargetRoomIds.length === 0) {
    throw new BadRequestException('targetRoomIds is required');
  }

  const sourceSender = sourceMessage.senderId
    ? await this.userRepo.findOne({ where: { id: sourceMessage.senderId } })
    : undefined;
  const sourceRoomLabel =
    sourceAccess.room.name ||
    sourceAccess.room.roomKey ||
    `${sourceAccess.room.roomType}-${sourceAccess.room.id}`;
  const sourceConversationKind =
    sourceAccess.room.roomType === ChatRoomType.CHANNEL
      ? 'channel'
      : sourceAccess.room.roomType === ChatRoomType.GROUP_DM
        ? 'group_dm'
        : 'dm';
  const sourceConversationKey = `${sourceConversationKind}:${sourceRoomId}`;
  const sourceSentAtIso = sourceMessage.sentAt?.toISOString();
  const sourceSenderDisplayName = sourceMessage.senderId
    ? this.buildUserDisplayName({
        userId: sourceMessage.senderId,
        email: sourceSender?.email,
        firstName: sourceSender?.firstName,
        lastName: sourceSender?.lastName,
      })
    : null;
  const note = dto.note?.trim() ?? '';
  const finalContent = note;
  const forwardMessageType = this.resolveForwardMessageType(
    sourceMessage,
    sourceAttachments,
  );

  const forwardedSnapshot: Record<string, any> = {
    originalMessageId: sourceMessage.id,
    originalContent: sourceMessage.content ?? '',
    originalContentFormat: resolveMessageContentFormatByRichContent(
      sourceMessage.richContent,
    ),
    originalRichContent: sourceMessage.richContent ?? null,
    originalMessageType: sourceMessage.messageType,
    originalSenderId: sourceMessage.senderId ?? null,
    originalSenderEmail: sourceSender?.email ?? null,
    originalSenderFirstName: sourceSender?.firstName ?? null,
    originalSenderLastName: sourceSender?.lastName ?? null,
    originalSenderDisplayName: sourceSenderDisplayName,
    originalSenderAvatarUrl: sourceSender?.avatarUrl ?? null,
    originalSentAt: sourceSentAtIso ?? null,
    sourceConversationKey,
    sourceConversationLabel: sourceRoomLabel,
    sourceConversationKind,
    sourceConversationVisibility: sourceAccess.room.visibility,
    // Keep legacy aliases for backward-compatibility with existing FE fallbacks.
    sourceConversationContext: `From ${sourceRoomLabel}`,
    sourceDateLabel: sourceSentAtIso ?? null,
    originalRoomId: sourceRoomId,
    originalAuthorId: sourceMessage.senderId ?? null,
    originalAuthorEmail: sourceSender?.email ?? null,
    originalAuthorFirstName: sourceSender?.firstName ?? null,
    originalAuthorLastName: sourceSender?.lastName ?? null,
    originalTime: sourceSentAtIso ?? null,
    originalAvatarUrl: sourceSender?.avatarUrl ?? null,
    attachments: sourceAttachments.map((attachment) =>
      this.toForwardedAttachmentSnapshot(attachment),
    ),
  };

  const results: ForwardMessageTargetResultResponse[] = [];

  for (const targetRoomId of uniqueTargetRoomIds) {
    try {
      const clientMessageId = this.buildForwardClientMessageId({
        prefix: dto.clientMessageIdPrefix?.trim(),
        targetRoomId,
      });

      const forwardedMessage = await this.sendMessage(
        organizationId,
        targetRoomId,
        userId,
        {
          content: finalContent,
          messageType: forwardMessageType,
          clientMessageId,
          metadata: {
            source: 'forward',
            forwardedFromConversationKey: sourceConversationKey,
            forwardedFromMessageId: sourceMessage.id,
            forwardedFromRoomId: sourceRoomId,
            forwardedByUserId: userId,
            forwardedSnapshot,
          },
        },
      );

      const forwardedAttachments = await this.cloneAttachmentsForForward({
        organizationId,
        targetRoomId,
        targetMessageId: forwardedMessage.id,
        actorUserId: userId,
        sourceAttachments,
      });
      const hydratedForwardedMessage = await this.getRoomMessageById({
        organizationId,
        roomId: targetRoomId,
        messageId: forwardedMessage.id,
        userId,
      });
      if (forwardedAttachments.length > 0) {
        tryEmitMessageUpdatedRealtimeEvent.call(
          this,
          {
            organizationId,
            roomId: targetRoomId,
            actorUserId: userId,
            message: hydratedForwardedMessage,
          },
          'forward_attachments_reconciled',
        );
      }

      results.push({
        targetRoomId,
        forwarded: true,
        message: hydratedForwardedMessage,
        attachments: forwardedAttachments,
      });
    } catch (error) {
      results.push({
        targetRoomId,
        forwarded: false,
        error: this.resolveErrorMessage(error),
      });
    }
  }

  const forwardedCount = results.filter((item) => item.forwarded).length;

  return {
    sourceRoomId,
    sourceMessageId,
    requestedTargetCount: uniqueTargetRoomIds.length,
    forwardedCount,
    failedCount: uniqueTargetRoomIds.length - forwardedCount,
    results,
  };
}

export async function updateMessage(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
  dto: UpdateMessageRequest,
): Promise<RoomMessageResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  const message = await this.messageRepo.findOne({
    where: { id: messageId, organizationId, roomId },
  });
  if (!message) {
    throw new NotFoundException('Message not found');
  }
  if (message.isDeleted) {
    throw new BadRequestException('Cannot update a deleted message');
  }

  const isSender = message.senderId === userId;
  if (!isSender && !access.permissions.canManageMembers) {
    throw new ForbiddenException(
      'You do not have permission to update this message',
    );
  }

  const removeAttachmentIds = Array.from(
    new Set((dto.removeAttachmentIds || []).filter((id) => Boolean(id))),
  );
  const hasContentUpdate = Object.prototype.hasOwnProperty.call(dto, 'content');
  const hasRichContentUpdate = Object.prototype.hasOwnProperty.call(
    dto,
    'richContent',
  );
  const hasContentFormatUpdate = Object.prototype.hasOwnProperty.call(
    dto,
    'contentFormat',
  );
  if (
    !hasContentUpdate &&
    !hasRichContentUpdate &&
    !hasContentFormatUpdate &&
    dto.metadata === undefined &&
    removeAttachmentIds.length === 0
  ) {
    throw new BadRequestException(
      'At least one field is required: content, contentFormat, richContent, metadata or removeAttachmentIds',
    );
  }

  const shouldNormalizePayload =
    hasContentUpdate || hasRichContentUpdate || hasContentFormatUpdate;
  const nextPayload = shouldNormalizePayload
    ? normalizeMessageRichPayload({
        content: hasContentUpdate ? dto.content : message.content,
        richContent: hasRichContentUpdate
          ? dto.richContent
          : hasContentUpdate && !hasContentFormatUpdate
            ? undefined
            : hasContentFormatUpdate &&
                dto.contentFormat === ChatMessageContentFormat.PLAIN_TEXT
            ? undefined
            : message.richContent,
        contentFormat: hasContentFormatUpdate
          ? dto.contentFormat
          : hasRichContentUpdate
            ? undefined
          : hasContentUpdate
            ? ChatMessageContentFormat.PLAIN_TEXT
            : resolveMessageContentFormatByRichContent(message.richContent),
        requireContent: message.messageType === ChatMessageType.TEXT,
      })
    : {
        content: message.content,
        richContent: message.richContent,
        contentFormat: resolveMessageContentFormatByRichContent(
          message.richContent,
        ),
      };
  const contentChanged =
    nextPayload.content !== (message.content || undefined);
  const richContentChanged =
    JSON.stringify(nextPayload.richContent ?? null) !==
    JSON.stringify(message.richContent ?? null);
  const previewPlan = await this.buildLinkPreviewPlan({
    content: nextPayload.content,
    metadata: dto.metadata !== undefined ? dto.metadata : message.metadata,
    eagerFetch: true,
  });
  const metadataChanged =
    JSON.stringify(previewPlan.metadata ?? null) !==
    JSON.stringify(message.metadata ?? null);
  let attachmentsChanged = false;
  if (removeAttachmentIds.length > 0) {
    for (const attachmentId of removeAttachmentIds) {
      await this.removeMessageAttachment(
        organizationId,
        roomId,
        message.id,
        attachmentId,
        userId,
      );
    }
    attachmentsChanged = true;
  }

  if (!contentChanged && !richContentChanged && !metadataChanged && !attachmentsChanged) {
    return this.getRoomMessageById({
      organizationId,
      roomId,
      messageId: message.id,
      includeDeleted: true,
      userId,
    });
  }

  if (shouldNormalizePayload) {
    message.content = nextPayload.content;
    message.richContent = nextPayload.richContent;
    if (
      nextPayload.content &&
      message.messageType !== ChatMessageType.SYSTEM &&
      message.messageType !== ChatMessageType.EVENT
    ) {
      message.messageType = ChatMessageType.TEXT;
    }
  }
  message.metadata = previewPlan.metadata;
  message.isEdited = true;
  message.editedAt = new Date();

  const saved = await this.messageRepo.save(message);
  const response = await this.getRoomMessageById({
    organizationId,
    roomId,
    messageId: saved.id,
    includeDeleted: true,
    userId,
  });
  tryEmitMessageUpdatedRealtimeEvent.call(
    this,
    {
      organizationId,
      roomId,
      actorUserId: userId,
      message: response,
      roomDelta: {
        roomId,
        reason: 'message_updated',
        messageId: response.id,
        lastMessageId:
          access.room.lastMessageId === response.id ? response.id : undefined,
        lastMessageAt:
          access.room.lastMessageId === response.id ? response.sentAt : undefined,
        lastMessageSnippet:
          access.room.lastMessageId === response.id
            ? buildLastMessageSnippet(response)
            : undefined,
        shouldRefreshRoomSummary: false,
      },
    },
    'message_updated_mutation',
  );

  if (previewPlan.pendingUrls.length > 0) {
    this.chatLinkPreviewService.enqueuePreviewJobs({
      organizationId,
      roomId,
      messageId: response.id,
      actorUserId: userId,
      urls: previewPlan.pendingUrls,
    });
  }

  return response;
}
export async function deleteMessage(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
): Promise<RoomMessageResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  const message = await this.messageRepo.findOne({
    where: { id: messageId, organizationId, roomId },
  });
  if (!message) {
    throw new NotFoundException('Message not found');
  }

  const isSender = message.senderId === userId;
  if (!isSender && !access.permissions.canManageMembers) {
    throw new ForbiddenException(
      'You do not have permission to delete this message',
    );
  }

  let deletedNow = false;
  const previousLastMessageId = access.room.lastMessageId;
  const deletedLatestMessage = previousLastMessageId === message.id;
  let nextLastMessageAfterDelete:
    | Pick<ChatMessage, 'id' | 'sentAt' | 'content' | 'messageType' | 'isDeleted'>
    | null
    | undefined;
  if (!message.isDeleted) {
    await this.dataSource.transaction(async (manager) => {
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = undefined;
      message.richContent = undefined;
      await manager.save(message);

      if (message.parentMessageId) {
        await manager
          .createQueryBuilder()
          .update(ChatMessage)
          .set({ replyCount: () => 'GREATEST("reply_count" - 1, 0)' })
          .where('id = :id', { id: message.parentMessageId })
          .execute();
      }

      if (access.room.lastMessageId === message.id) {
        const latestMessage = await manager.findOne(ChatMessage, {
          where: { organizationId, roomId, isDeleted: false },
          order: { sentAt: 'DESC' },
          select: ['id', 'sentAt', 'content', 'messageType', 'isDeleted'],
        });

        nextLastMessageAfterDelete = latestMessage;
        access.room.lastMessageId = latestMessage?.id;
        access.room.lastMessageAt = latestMessage?.sentAt;
        await manager.save(access.room);
      }
    });
    deletedNow = true;
  }

  const response = await this.getRoomMessageById({
    organizationId,
    roomId,
    messageId: message.id,
    includeDeleted: true,
    userId,
  });
  if (deletedNow) {
    const event: ChatMessageDomainEvent = {
      organizationId,
      roomId,
      actorUserId: userId,
      message: stripInternalLinkPreviewSnapshots(response),
      roomDelta: {
        roomId,
        reason: 'message_deleted',
        messageId: response.id,
        lastMessageId: deletedLatestMessage ? access.room.lastMessageId : undefined,
        lastMessageAt: deletedLatestMessage ? access.room.lastMessageAt : undefined,
        lastMessageSnippet:
          deletedLatestMessage && nextLastMessageAfterDelete
            ? buildLastMessageSnippet({
                content: nextLastMessageAfterDelete.content,
                messageType: nextLastMessageAfterDelete.messageType,
                isDeleted: nextLastMessageAfterDelete.isDeleted,
              })
            : undefined,
        shouldRefreshRoomSummary: false,
      },
      occurredAt: new Date().toISOString(),
    };
    this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_DELETED, event);
  }
  return response;
}
