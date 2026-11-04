/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  CHAT_BOX_EVENTS,
  ChatMessageAttachmentAddedDomainEvent,
  ChatMessageAttachmentRemovedDomainEvent,
} from '@modules/chat-box/delegates/constants/chat-box-events.constant';
import { CompleteDirectUploadAttachmentRequest } from '@modules/chat-box/message-management/dto/request/complete-direct-upload-attachment.request';
import { RequestDirectUploadAuthRequest } from '@modules/chat-box/message-management/dto/request/request-direct-upload-auth.request';
import { UploadMessageAttachmentRequest } from '@modules/chat-box/message-management/dto/request/upload-message-attachment.request';
import { DirectUploadAuthResponse } from '@modules/chat-box/message-management/dto/response/direct-upload-auth.response';
import { MessageAttachmentResponse } from '@modules/chat-box/message-management/dto/response/message-attachment.response';
import { ChatAttachmentType } from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ChatMemberRole } from '@modules/chat-box/room-management/entities/room-member.entity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChatBoxServiceDelegateContext } from './message-delegate.types';
export async function uploadMessageAttachment(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
  file: Express.Multer.File,
  dto: UploadMessageAttachmentRequest,
): Promise<MessageAttachmentResponse> {
  if (!file) {
    throw new BadRequestException('file is required');
  }

  const resolvedAttachmentType =
    dto.attachmentType || this.detectAttachmentType(file.mimetype);
  this.assertAttachmentUploadPolicy({
    attachmentType: resolvedAttachmentType,
    mimeType: file.mimetype,
    fileName: dto.fileName?.trim() || file.originalname,
    fileSize:
      typeof file.size === 'number' && Number.isFinite(file.size)
        ? file.size
        : undefined,
  });

  await this.assertActiveOrgMember(organizationId, userId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  if (!access.permissions.canSendMessage) {
    throw new ForbiddenException(
      'You do not have permission to upload attachments',
    );
  }
  if (access.room.isArchived) {
    throw new BadRequestException('Cannot upload attachment to archived room');
  }

  const message = await this.messageRepo.findOne({
    where: { id: messageId, organizationId, roomId },
  });
  if (!message || message.isDeleted) {
    throw new NotFoundException('Message not found');
  }

  const isSender = message.senderId === userId;
  const canModerate =
    access.member.memberRole === ChatMemberRole.OWNER ||
    access.member.memberRole === ChatMemberRole.ADMIN;
  if (!isSender && !canModerate) {
    throw new ForbiddenException(
      'Only message sender or room owner/admin can upload attachment to this message',
    );
  }

  const uploadIdempotencyKey = this.buildUploadIdempotencyKey({
    organizationId,
    roomId,
    messageId,
    userId,
    clientUploadId: dto.clientUploadId,
  });
  if (uploadIdempotencyKey) {
    const existing = await this.findIdempotentAttachment(uploadIdempotencyKey);
    if (existing) {
      return existing;
    }
  }

  const folder = `chat/${organizationId}/${roomId}`;
  const uploaded = await this.imagekitService.uploadFile(file, folder);
  const previewSeed = this.buildAttachmentPreviewSeed({
    attachmentType: resolvedAttachmentType,
    fileUrl: uploaded.url,
    fileName: dto.fileName?.trim() || file.originalname || uploaded.fileName,
    mimeType: file.mimetype,
    fileSize:
      typeof file.size === 'number' && Number.isFinite(file.size)
        ? file.size
        : undefined,
  });

  const attachment = await this.attachmentRepo.save(
    this.attachmentRepo.create({
      organizationId,
      messageId,
      attachmentType: resolvedAttachmentType,
      fileName: dto.fileName?.trim() || file.originalname || uploaded.fileName,
      fileUrl: uploaded.url,
      mimeType: file.mimetype || undefined,
      fileSize: typeof file.size === 'number' ? String(file.size) : undefined,
      checksum: dto.checksum?.trim(),
      width: dto.width,
      height: dto.height,
      durationMs: dto.durationMs,
      documentType: previewSeed.documentType,
      previewStatus: previewSeed.previewStatus,
      previewThumbnailUrl: previewSeed.thumbnailUrl,
      previewUrl: previewSeed.previewUrl,
      previewWidth: previewSeed.previewWidth,
      previewHeight: previewSeed.previewHeight,
      previewPage: previewSeed.previewPage,
      pageCount: previewSeed.pageCount,
      previewErrorCode: previewSeed.previewErrorCode,
      previewUpdatedAt: previewSeed.previewUpdatedAt,
    }),
  );

  const response = this.toMessageAttachmentResponse(attachment);
  if (uploadIdempotencyKey) {
    await this.cacheIdempotentAttachment(uploadIdempotencyKey, attachment.id);
  }
  const event: ChatMessageAttachmentAddedDomainEvent = {
    organizationId,
    roomId,
    messageId,
    actorUserId: userId,
    attachment: response,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_ATTACHMENT_ADDED, event);
  this.emitAttachmentPreviewUpdatedEvent({
    organizationId,
    roomId,
    messageId,
    actorUserId: userId,
    attachment: response,
  });
  if (previewSeed.shouldEnqueue) {
    this.enqueueAttachmentPreviewJob({
      organizationId,
      roomId,
      messageId,
      attachmentId: attachment.id,
      actorUserId: userId,
    });
  }

  return response;
}
export async function listMessageAttachments(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
): Promise<MessageAttachmentResponse[]> {
  await this.assertActiveOrgMember(organizationId, userId);
  await this.getRoomAccessForCaller(organizationId, roomId, userId);

  const message = await this.messageRepo.findOne({
    where: { id: messageId, organizationId, roomId, isDeleted: false },
    select: ['id'],
  });
  if (!message) {
    throw new NotFoundException('Message not found');
  }

  const attachments = await this.attachmentRepo.find({
    where: { organizationId, messageId },
    order: { createdAt: 'ASC' },
  });

  return attachments.map((attachment) =>
    this.toMessageAttachmentResponse(attachment),
  );
}
export async function removeMessageAttachment(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  attachmentId: string,
  userId: string,
): Promise<MessageAttachmentResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  const message = await this.messageRepo.findOne({
    where: { id: messageId, organizationId, roomId },
  });
  if (!message || message.isDeleted) {
    throw new NotFoundException('Message not found');
  }

  const attachment = await this.attachmentRepo.findOne({
    where: {
      id: attachmentId,
      organizationId,
      messageId,
    },
  });
  if (!attachment) {
    throw new NotFoundException('Attachment not found');
  }

  const isSender = message.senderId === userId;
  const canModerate =
    access.member.memberRole === ChatMemberRole.OWNER ||
    access.member.memberRole === ChatMemberRole.ADMIN;
  if (!isSender && !canModerate) {
    throw new ForbiddenException(
      'Only message sender or room owner/admin can remove attachment from this message',
    );
  }

  const response = this.toMessageAttachmentResponse(attachment);

  try {
    await this.imagekitService.deleteFileByUrl({ url: attachment.fileUrl });
  } catch {
    // If remote object is already gone, we still remove DB metadata to keep state consistent.
  }

  await this.attachmentRepo.remove(attachment);

  const event: ChatMessageAttachmentRemovedDomainEvent = {
    organizationId,
    roomId,
    messageId,
    actorUserId: userId,
    attachmentId,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_ATTACHMENT_REMOVED, event);

  return response;
}
export async function requestDirectUploadAuth(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
  dto: RequestDirectUploadAuthRequest,
): Promise<DirectUploadAuthResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  if (!access.permissions.canSendMessage) {
    throw new ForbiddenException(
      'You do not have permission to upload attachments',
    );
  }
  if (access.room.isArchived) {
    throw new BadRequestException('Cannot upload attachment to archived room');
  }

  const message = await this.messageRepo.findOne({
    where: { id: messageId, organizationId, roomId },
  });
  if (!message || message.isDeleted) {
    throw new NotFoundException('Message not found');
  }

  const isSender = message.senderId === userId;
  const canModerate =
    access.member.memberRole === ChatMemberRole.OWNER ||
    access.member.memberRole === ChatMemberRole.ADMIN;
  if (!isSender && !canModerate) {
    throw new ForbiddenException(
      'Only message sender or room owner/admin can upload attachment to this message',
    );
  }

  const auth = this.imagekitService.getDirectUploadAuthentication({
    token: dto.clientUploadId,
    expireInSeconds: 600,
  });
  return {
    folder: `chat/${organizationId}/${roomId}`,
    token: auth.token,
    expire: auth.expire,
    signature: auth.signature,
    publicKey: auth.publicKey,
    uploadEndpoint: auth.uploadEndpoint,
    clientUploadId: dto.clientUploadId?.trim() || undefined,
    fileName: dto.fileName?.trim() || undefined,
  };
}
export async function completeDirectUploadAttachment(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  roomId: string,
  messageId: string,
  userId: string,
  dto: CompleteDirectUploadAttachmentRequest,
): Promise<MessageAttachmentResponse> {
  await this.assertActiveOrgMember(organizationId, userId);

  const access = await this.getRoomAccessForCaller(
    organizationId,
    roomId,
    userId,
  );
  if (!access.permissions.canSendMessage) {
    throw new ForbiddenException(
      'You do not have permission to upload attachments',
    );
  }
  if (access.room.isArchived) {
    throw new BadRequestException('Cannot upload attachment to archived room');
  }

  const message = await this.messageRepo.findOne({
    where: { id: messageId, organizationId, roomId },
  });
  if (!message || message.isDeleted) {
    throw new NotFoundException('Message not found');
  }

  const isSender = message.senderId === userId;
  const canModerate =
    access.member.memberRole === ChatMemberRole.OWNER ||
    access.member.memberRole === ChatMemberRole.ADMIN;
  if (!isSender && !canModerate) {
    throw new ForbiddenException(
      'Only message sender or room owner/admin can upload attachment to this message',
    );
  }

  const resolvedAttachmentType =
    dto.attachmentType ||
    this.detectAttachmentTypeByMime(dto.mimeType) ||
    this.detectAttachmentTypeFromFileName(dto.fileName) ||
    ChatAttachmentType.FILE;
  const normalizedFileName = dto.fileName.trim();
  if (!normalizedFileName) {
    throw new BadRequestException('fileName is required');
  }
  this.assertAttachmentUploadPolicy({
    attachmentType: resolvedAttachmentType,
    mimeType: dto.mimeType,
    fileName: normalizedFileName,
    fileSize: dto.fileSize,
  });

  const uploadIdempotencyKey = this.buildUploadIdempotencyKey({
    organizationId,
    roomId,
    messageId,
    userId,
    clientUploadId: dto.clientUploadId,
  });
  if (uploadIdempotencyKey) {
    const existing = await this.findIdempotentAttachment(uploadIdempotencyKey);
    if (existing) {
      return existing;
    }
  }
  const previewSeed = this.buildAttachmentPreviewSeed({
    attachmentType: resolvedAttachmentType,
    fileUrl: dto.fileUrl.trim(),
    fileName: normalizedFileName,
    mimeType: dto.mimeType,
    fileSize: dto.fileSize,
  });

  const attachment = await this.attachmentRepo.save(
    this.attachmentRepo.create({
      organizationId,
      messageId,
      attachmentType: resolvedAttachmentType,
      fileName: normalizedFileName,
      fileUrl: dto.fileUrl.trim(),
      mimeType: dto.mimeType?.trim() || undefined,
      fileSize:
        typeof dto.fileSize === 'number' ? String(dto.fileSize) : undefined,
      checksum: dto.checksum?.trim(),
      width: dto.width,
      height: dto.height,
      durationMs: dto.durationMs,
      documentType: previewSeed.documentType,
      previewStatus: previewSeed.previewStatus,
      previewThumbnailUrl: previewSeed.thumbnailUrl,
      previewUrl: previewSeed.previewUrl,
      previewWidth: previewSeed.previewWidth,
      previewHeight: previewSeed.previewHeight,
      previewPage: previewSeed.previewPage,
      pageCount: previewSeed.pageCount,
      previewErrorCode: previewSeed.previewErrorCode,
      previewUpdatedAt: previewSeed.previewUpdatedAt,
    }),
  );
  const response = this.toMessageAttachmentResponse(attachment);
  if (uploadIdempotencyKey) {
    await this.cacheIdempotentAttachment(uploadIdempotencyKey, attachment.id);
  }

  const event: ChatMessageAttachmentAddedDomainEvent = {
    organizationId,
    roomId,
    messageId,
    actorUserId: userId,
    attachment: response,
    occurredAt: new Date().toISOString(),
  };
  this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_ATTACHMENT_ADDED, event);
  this.emitAttachmentPreviewUpdatedEvent({
    organizationId,
    roomId,
    messageId,
    actorUserId: userId,
    attachment: response,
  });
  if (previewSeed.shouldEnqueue) {
    this.enqueueAttachmentPreviewJob({
      organizationId,
      roomId,
      messageId,
      attachmentId: attachment.id,
      actorUserId: userId,
    });
  }

  return response;
}
