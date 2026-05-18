/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  CHAT_BOX_EVENTS,
  ChatMessageAttachmentAddedDomainEvent,
} from '@modules/chat-box/delegates/constants/chat-box-events.constant';
import { MessageAttachmentResponse } from '@modules/chat-box/message-management/dto/response/message-attachment.response';
import {
  ChatAttachmentType,
  ChatMessageAttachment,
} from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ChatMessageMention } from '@modules/chat-box/message-management/entities/message-mention.entity';
import {
  ChatMessage,
  ChatMessageType,
} from '@modules/chat-box/message-management/entities/message.entity';
import { ChatNotifyLevel } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ChatRoomType } from '@modules/chat-box/room-management/entities/room.entity';
import { BadRequestException } from '@nestjs/common';
import { In } from 'typeorm';
import { ChatBoxServiceDelegateContext } from './message-delegate.types';

export enum ChatSpecialMentionType {
  EVERYONE = 'everyone',
  CHANNEL = 'channel',
}

type RawSpecialMention = {
  type: ChatSpecialMentionType;
};

export function extractMentionedUserIds(
  this: ChatBoxServiceDelegateContext,
  metadata?: Record<string, any>,
): string[] {
  const raw = metadata?.mentionedUserIds;
  if (raw === undefined || raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new BadRequestException(
      'metadata.mentionedUserIds must be an array of UUID v4 strings',
    );
  }

  const uuidV4Pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const unique = new Set<string>();
  const invalidValues: string[] = [];

  for (const item of raw) {
    if (typeof item !== 'string') {
      invalidValues.push(String(item));
      continue;
    }
    const normalized = item.trim();
    if (!uuidV4Pattern.test(normalized)) {
      invalidValues.push(item);
      continue;
    }
    unique.add(normalized);
  }

  if (invalidValues.length > 0) {
    throw new BadRequestException(
      `metadata.mentionedUserIds contains invalid UUID v4 values: ${invalidValues.join(', ')}`,
    );
  }

  return Array.from(unique);
}

export function extractSpecialMentionTypes(
  this: ChatBoxServiceDelegateContext,
  metadata?: Record<string, any>,
): ChatSpecialMentionType[] {
  const raw = metadata?.specialMentions;
  if (raw === undefined || raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new BadRequestException(
      'metadata.specialMentions must be an array of objects with type: everyone|channel',
    );
  }

  const normalizedTypes: ChatSpecialMentionType[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new BadRequestException(
        'metadata.specialMentions must be an array of objects with type: everyone|channel',
      );
    }
    const mentionTypeRaw = (item as RawSpecialMention).type;
    if (
      mentionTypeRaw !== ChatSpecialMentionType.EVERYONE &&
      mentionTypeRaw !== ChatSpecialMentionType.CHANNEL
    ) {
      throw new BadRequestException(
        'metadata.specialMentions.type only supports everyone|channel',
      );
    }
    normalizedTypes.push(mentionTypeRaw);
  }

  const dedupedTypes = Array.from(new Set(normalizedTypes));
  if (dedupedTypes.length !== normalizedTypes.length) {
    throw new BadRequestException(
      'metadata.specialMentions contains duplicate types',
    );
  }

  return dedupedTypes;
}

export function validateSpecialMentionTypesForRoom(
  this: ChatBoxServiceDelegateContext,
  params: {
    roomType: ChatRoomType;
    specialMentionTypes: ChatSpecialMentionType[];
  },
): void {
  if (params.specialMentionTypes.length === 0) {
    return;
  }

  if (params.roomType === ChatRoomType.DM) {
    throw new BadRequestException(
      'Special mentions are not supported in direct messages',
    );
  }

  if (params.roomType === ChatRoomType.CHANNEL) {
    const invalidType = params.specialMentionTypes.find(
      (type) => type !== ChatSpecialMentionType.CHANNEL,
    );
    if (invalidType) {
      throw new BadRequestException(
        'Special mention type is invalid for this room',
      );
    }
    return;
  }

  if (params.roomType === ChatRoomType.GROUP_DM) {
    const invalidType = params.specialMentionTypes.find(
      (type) => type !== ChatSpecialMentionType.EVERYONE,
    );
    if (invalidType) {
      throw new BadRequestException(
        'Special mention type is invalid for this room',
      );
    }
    return;
  }

  throw new BadRequestException('Special mention type is invalid for this room');
}

export function shouldSkipMentionForNotifyLevel(
  this: ChatBoxServiceDelegateContext,
  notifyLevel: ChatNotifyLevel,
  muteUntil?: Date,
): boolean {
  if (notifyLevel !== ChatNotifyLevel.MUTE) {
    return false;
  }

  if (!muteUntil) {
    return true;
  }

  return muteUntil.getTime() > Date.now();
}

export function buildSpecialMentionsMetadata(
  this: ChatBoxServiceDelegateContext,
  specialMentionTypes: ChatSpecialMentionType[],
): Array<{ type: ChatSpecialMentionType }> | undefined {
  if (specialMentionTypes.length === 0) {
    return undefined;
  }

  return specialMentionTypes.map((type) => ({ type }));
}

export function withCanonicalMentionMetadata(
  this: ChatBoxServiceDelegateContext,
  params: {
    metadata?: Record<string, any>;
    mentionedUserIds: string[];
    specialMentionTypes: ChatSpecialMentionType[];
  },
): Record<string, any> | undefined {
  const nextMetadata =
    params.metadata && typeof params.metadata === 'object'
      ? { ...params.metadata }
      : {};
  if (params.mentionedUserIds.length > 0) {
    nextMetadata.mentionedUserIds = params.mentionedUserIds;
  } else {
    delete nextMetadata.mentionedUserIds;
  }

  const normalizedSpecialMentions = buildSpecialMentionsMetadata.call(
    this,
    params.specialMentionTypes,
  );
  if (normalizedSpecialMentions) {
    nextMetadata.specialMentions = normalizedSpecialMentions;
  } else {
    delete nextMetadata.specialMentions;
  }

  return Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined;
}
export async function getUnreadCountForRoom(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    userId: string;
    lastReadAt?: Date;
  },
): Promise<number> {
  const qb = this.messageRepo
    .createQueryBuilder('m')
    .where('m.organization_id = :organizationId', {
      organizationId: params.organizationId,
    })
    .andWhere('m.room_id = :roomId', { roomId: params.roomId })
    .andWhere('m.is_deleted = false')
    .andWhere('(m.sender_id IS NULL OR m.sender_id <> :userId)', {
      userId: params.userId,
    });

  if (params.lastReadAt) {
    qb.andWhere('m.sent_at > :lastReadAt', { lastReadAt: params.lastReadAt });
  }

  return await qb.getCount();
}
export async function markMentionsAsReadByReadState(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    userId: string;
    lastReadAt: Date;
  },
): Promise<void> {
  const mentionIds = await this.mentionRepo
    .createQueryBuilder('mn')
    .innerJoin(
      ChatMessage,
      'm',
      'm.id = mn.message_id AND m.is_deleted = false',
    )
    .where('mn.organization_id = :organizationId', {
      organizationId: params.organizationId,
    })
    .andWhere('mn.mentioned_user_id = :userId', { userId: params.userId })
    .andWhere('mn.is_read = false')
    .andWhere('m.room_id = :roomId', { roomId: params.roomId })
    .andWhere('m.sent_at <= :lastReadAt', { lastReadAt: params.lastReadAt })
    .select('mn.id', 'id')
    .getRawMany();

  if (mentionIds.length === 0) {
    return;
  }

  await this.mentionRepo.update(
    { id: In(mentionIds.map((item) => item.id)) },
    { isRead: true, readAt: new Date() },
  );
}
export function buildForwardClientMessageId(
  this: ChatBoxServiceDelegateContext,
  params: {
    prefix?: string;
    targetRoomId: string;
  },
): string | undefined {
  if (!params.prefix) {
    return undefined;
  }

  const normalizedPrefix = params.prefix.trim();
  if (!normalizedPrefix) {
    return undefined;
  }

  const suffix = `-${params.targetRoomId}`;
  if (normalizedPrefix.length + suffix.length <= 100) {
    return `${normalizedPrefix}${suffix}`;
  }

  return `${normalizedPrefix.slice(0, Math.max(1, 100 - suffix.length))}${suffix}`;
}
export function resolveErrorMessage(
  this: ChatBoxServiceDelegateContext,
  error: unknown,
): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return 'Failed to forward message to target room';
}
export function resolveForwardMessageType(
  this: ChatBoxServiceDelegateContext,
  sourceMessage: ChatMessage,
  sourceAttachments: ChatMessageAttachment[],
): ChatMessageType {
  if (
    sourceMessage.messageType === ChatMessageType.SYSTEM ||
    sourceMessage.messageType === ChatMessageType.EVENT
  ) {
    return ChatMessageType.TEXT;
  }

  if (
    sourceAttachments.some(
      (attachment) => attachment.attachmentType === ChatAttachmentType.IMAGE,
    )
  ) {
    return ChatMessageType.IMAGE;
  }

  if (sourceAttachments.length > 0) {
    return ChatMessageType.FILE;
  }

  if (
    sourceMessage.messageType === ChatMessageType.IMAGE ||
    sourceMessage.messageType === ChatMessageType.FILE
  ) {
    return sourceMessage.messageType;
  }

  return ChatMessageType.TEXT;
}
export async function cloneAttachmentsForForward(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    targetRoomId: string;
    targetMessageId: string;
    actorUserId: string;
    sourceAttachments: ChatMessageAttachment[];
  },
): Promise<MessageAttachmentResponse[]> {
  if (params.sourceAttachments.length === 0) {
    return [];
  }

  const clonedAttachments = params.sourceAttachments.map((attachment) =>
    this.attachmentRepo.create({
      organizationId: params.organizationId,
      messageId: params.targetMessageId,
      attachmentType: attachment.attachmentType,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      checksum: attachment.checksum,
      width: attachment.width,
      height: attachment.height,
      durationMs: attachment.durationMs,
      documentType: attachment.documentType,
      previewStatus: attachment.previewStatus,
      previewThumbnailUrl: attachment.previewThumbnailUrl,
      previewUrl: attachment.previewUrl,
      previewWidth: attachment.previewWidth,
      previewHeight: attachment.previewHeight,
      previewPage: attachment.previewPage,
      pageCount: attachment.pageCount,
      previewErrorCode: attachment.previewErrorCode,
      previewUpdatedAt: attachment.previewUpdatedAt,
    }),
  );

  const savedAttachments = await this.attachmentRepo.save(clonedAttachments);
  const responses = savedAttachments.map((attachment) =>
    this.toMessageAttachmentResponse(attachment),
  );

  for (const attachment of responses) {
    const event: ChatMessageAttachmentAddedDomainEvent = {
      organizationId: params.organizationId,
      roomId: params.targetRoomId,
      messageId: params.targetMessageId,
      actorUserId: params.actorUserId,
      attachment,
      occurredAt: new Date().toISOString(),
    };
    this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_ATTACHMENT_ADDED, event);
    this.emitAttachmentPreviewUpdatedEvent({
      organizationId: params.organizationId,
      roomId: params.targetRoomId,
      messageId: params.targetMessageId,
      actorUserId: params.actorUserId,
      attachment,
    });
    if (attachment.previewStatus === 'pending') {
      this.enqueueAttachmentPreviewJob({
        organizationId: params.organizationId,
        roomId: params.targetRoomId,
        messageId: params.targetMessageId,
        attachmentId: attachment.id,
        actorUserId: params.actorUserId,
      });
    }
  }

  return responses;
}
export function toForwardedAttachmentSnapshot(
  this: ChatBoxServiceDelegateContext,
  attachment: ChatMessageAttachment,
): Record<string, any> {
  return {
    id: attachment.id,
    attachmentType: attachment.attachmentType,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    mimeType: attachment.mimeType,
    fileSize: attachment.fileSize,
    checksum: attachment.checksum,
    width: attachment.width,
    height: attachment.height,
    durationMs: attachment.durationMs,
    documentType: attachment.documentType,
    previewStatus: attachment.previewStatus,
    previewThumbnailUrl: attachment.previewThumbnailUrl,
    previewUrl: attachment.previewUrl,
    previewWidth: attachment.previewWidth,
    previewHeight: attachment.previewHeight,
    previewPage: attachment.previewPage,
    pageCount: attachment.pageCount,
    previewErrorCode: attachment.previewErrorCode,
    previewUpdatedAt: attachment.previewUpdatedAt,
    createdAt: attachment.createdAt,
  };
}
