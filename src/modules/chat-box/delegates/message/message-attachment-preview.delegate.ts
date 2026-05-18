/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  ChatAttachmentPreviewAssetSource,
  MessageAttachmentResponse,
} from '@modules/chat-box/message-management/dto/response/message-attachment.response';
import {
  ChatAttachmentDocumentType,
  ChatAttachmentPreviewStatus,
  ChatAttachmentType,
  ChatMessageAttachment,
} from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { BadRequestException } from '@nestjs/common';
import { ChatBoxServiceDelegateContext } from './message-delegate.types';

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

export function buildAttachmentPreview(
  this: ChatBoxServiceDelegateContext,
  params: {
    attachmentType: ChatAttachmentType;
    fileUrl: string;
    fileName?: string;
    mimeType?: string;
    previewDocumentType?: ChatAttachmentDocumentType;
    previewStatus?: ChatAttachmentPreviewStatus;
    previewThumbnailUrl?: string;
    previewUrl?: string;
    previewWidth?: number;
    previewHeight?: number;
    previewPage?: number;
    pageCount?: number;
    previewErrorCode?: string;
    previewUpdatedAt?: Date | string;
  },
): {
  thumbnailUrl?: string;
  previewUrl?: string;
  documentType: ChatAttachmentDocumentType;
  previewStatus: ChatAttachmentPreviewStatus;
  previewWidth?: number;
  previewHeight?: number;
  previewPage?: number;
  pageCount?: number;
  previewErrorCode?: string;
  previewUpdatedAt?: Date;
} {
  const lowerMime = (params.mimeType || '').toLowerCase();
  const extension = this.getFileExtension(params.fileName || params.fileUrl);
  const fallbackDocumentType = this.resolveAttachmentDocumentType({
    extension,
    mimeType: lowerMime,
  });

  if (this.hasPersistedAttachmentPreview(params)) {
    return {
      thumbnailUrl: params.previewThumbnailUrl,
      previewUrl: params.previewUrl,
      documentType: params.previewDocumentType || fallbackDocumentType,
      previewStatus: params.previewStatus || 'ready',
      previewWidth: params.previewWidth,
      previewHeight: params.previewHeight,
      previewPage: params.previewPage,
      pageCount: params.pageCount,
      previewErrorCode: params.previewErrorCode,
      previewUpdatedAt: this.toDateOrUndefined(params.previewUpdatedAt),
    };
  }

  return this.buildLegacyAttachmentPreview({
    attachmentType: params.attachmentType,
    fileUrl: params.fileUrl,
    fileName: params.fileName,
    mimeType: params.mimeType,
  });
}
export function buildLegacyAttachmentPreview(
  this: ChatBoxServiceDelegateContext,
  params: {
    attachmentType: ChatAttachmentType;
    fileUrl: string;
    fileName?: string;
    mimeType?: string;
  },
): {
  thumbnailUrl?: string;
  previewUrl?: string;
  documentType: ChatAttachmentDocumentType;
  previewStatus: ChatAttachmentPreviewStatus;
  previewWidth?: number;
  previewHeight?: number;
  previewPage?: number;
  pageCount?: number;
  previewErrorCode?: string;
  previewUpdatedAt?: Date;
} {
  const lowerMime = (params.mimeType || '').toLowerCase();
  const extension = this.getFileExtension(params.fileName || params.fileUrl);
  const documentType = this.resolveAttachmentDocumentType({
    extension,
    mimeType: lowerMime,
  });

  if (!params.fileUrl) {
    return {
      documentType,
      previewStatus: 'failed',
      previewErrorCode: 'missing_file_url',
    };
  }

  if (params.attachmentType === ChatAttachmentType.IMAGE) {
    return {
      documentType,
      previewStatus: 'ready',
      thumbnailUrl: params.fileUrl,
      previewUrl: params.fileUrl,
    };
  }

  if (params.attachmentType === ChatAttachmentType.VIDEO) {
    return {
      documentType,
      previewStatus: 'ready',
      thumbnailUrl: this.tryBuildImageKitTransformationUrl(
        params.fileUrl,
        'so-1,w-480',
      ),
      previewUrl: params.fileUrl,
    };
  }

  if (lowerMime.includes('application/pdf') || extension === 'pdf') {
    return {
      documentType: 'pdf',
      previewStatus: 'ready',
      thumbnailUrl: this.tryBuildImageKitTransformationUrl(
        params.fileUrl,
        'pg-1,w-480',
      ),
      previewUrl: params.fileUrl,
      previewPage: 1,
    };
  }

  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
    return {
      documentType,
      previewStatus: 'ready',
      previewUrl: this.buildOfficeEmbedPreviewUrl(params.fileUrl),
      previewPage: 1,
    };
  }

  return {
    documentType,
    previewStatus: 'failed',
    previewErrorCode: 'preview_not_supported',
  };
}
export function buildAttachmentPreviewSeed(
  this: ChatBoxServiceDelegateContext,
  params: {
    attachmentType: ChatAttachmentType;
    fileUrl: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
  },
): AttachmentPreviewSeed {
  const now = new Date();
  const lowerMime = (params.mimeType || '').toLowerCase();
  const extension = this.getFileExtension(params.fileName || params.fileUrl);
  const documentType = this.resolveAttachmentDocumentType({
    extension,
    mimeType: lowerMime,
  });
  const fileSizeBytes = this.coerceAttachmentFileSizeBytes(params.fileSize);
  const supportsRenderedPreview = this.supportsRenderedAttachmentPreview({
    attachmentType: params.attachmentType,
    documentType,
    extension,
    mimeType: lowerMime,
  });

  if (!params.fileUrl) {
    return {
      documentType,
      previewStatus: 'failed',
      previewErrorCode: 'missing_file_url',
      previewUpdatedAt: now,
      shouldEnqueue: false,
    };
  }

  if (params.attachmentType === ChatAttachmentType.IMAGE) {
    return {
      documentType,
      previewStatus: 'ready',
      thumbnailUrl: params.fileUrl,
      previewUrl: params.fileUrl,
      previewUpdatedAt: now,
      shouldEnqueue: false,
    };
  }

  if (params.attachmentType === ChatAttachmentType.VIDEO) {
    return {
      documentType,
      previewStatus: 'ready',
      thumbnailUrl: this.tryBuildImageKitTransformationUrl(
        params.fileUrl,
        'so-1,w-480',
      ),
      previewUrl: params.fileUrl,
      previewUpdatedAt: now,
      shouldEnqueue: false,
    };
  }

  if (
    supportsRenderedPreview &&
    this.shouldSkipAttachmentPreviewForLargeFile(fileSizeBytes)
  ) {
    return {
      documentType,
      previewStatus: 'failed',
      previewErrorCode: 'preview_file_too_large',
      previewUpdatedAt: now,
      shouldEnqueue: false,
    };
  }

  if (documentType === 'pdf') {
    return {
      documentType: 'pdf',
      previewStatus: 'pending',
      previewUrl: params.fileUrl,
      previewPage: 1,
      previewUpdatedAt: now,
      shouldEnqueue: true,
    };
  }

  if (this.isOfficeFileExtension(extension)) {
    return {
      documentType,
      previewStatus: 'pending',
      previewUrl: this.buildOfficeEmbedPreviewUrl(params.fileUrl),
      previewPage: 1,
      previewUpdatedAt: now,
      shouldEnqueue: true,
    };
  }

  if (
    this.supportsRenderedAttachmentPreview({
      attachmentType: params.attachmentType,
      documentType,
      extension,
      mimeType: lowerMime,
    })
  ) {
    return {
      documentType,
      previewStatus: 'pending',
      previewUrl: params.fileUrl,
      previewPage: 1,
      previewUpdatedAt: now,
      shouldEnqueue: true,
    };
  }

  return {
    documentType,
    previewStatus: 'failed',
    previewErrorCode: 'preview_not_supported',
    previewUpdatedAt: now,
    shouldEnqueue: false,
  };
}
export function hasPersistedAttachmentPreview(
  this: ChatBoxServiceDelegateContext,
  params: {
    previewDocumentType?: ChatAttachmentDocumentType;
    previewStatus?: ChatAttachmentPreviewStatus;
    previewThumbnailUrl?: string;
    previewUrl?: string;
    previewWidth?: number;
    previewHeight?: number;
    previewPage?: number;
    pageCount?: number;
    previewErrorCode?: string;
    previewUpdatedAt?: Date | string;
  },
): boolean {
  return (
    typeof params.previewStatus === 'string' ||
    typeof params.previewDocumentType === 'string' ||
    typeof params.previewThumbnailUrl === 'string' ||
    typeof params.previewUrl === 'string' ||
    typeof params.previewWidth === 'number' ||
    typeof params.previewHeight === 'number' ||
    typeof params.previewPage === 'number' ||
    typeof params.pageCount === 'number' ||
    typeof params.previewErrorCode === 'string' ||
    params.previewUpdatedAt instanceof Date ||
    typeof params.previewUpdatedAt === 'string'
  );
}
export function isOfficeFileExtension(
  this: ChatBoxServiceDelegateContext,
  extension?: string,
): boolean {
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(
    (extension || '').toLowerCase(),
  );
}
export function isTextPreviewFile(
  this: ChatBoxServiceDelegateContext,
  params: {
    extension?: string;
    mimeType?: string;
  },
): boolean {
  const extension = (params.extension || '').toLowerCase();
  const mimeType = (params.mimeType || '').toLowerCase();
  return (
    ['txt', 'md', 'csv', 'json'].includes(extension) ||
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/ld+json'
  );
}
export function supportsRenderedAttachmentPreview(
  this: ChatBoxServiceDelegateContext,
  params: {
    attachmentType: ChatAttachmentType;
    documentType: ChatAttachmentDocumentType;
    extension?: string;
    mimeType?: string;
  },
): boolean {
  if (params.attachmentType !== ChatAttachmentType.FILE) {
    return false;
  }
  if (
    params.documentType === 'pdf' ||
    params.documentType === 'word' ||
    params.documentType === 'excel' ||
    params.documentType === 'powerpoint'
  ) {
    return true;
  }
  return this.isTextPreviewFile({
    extension: params.extension,
    mimeType: params.mimeType,
  });
}
export function coerceAttachmentFileSizeBytes(
  this: ChatBoxServiceDelegateContext,
  fileSize?: number | string,
): number | undefined {
  if (
    typeof fileSize === 'number' &&
    Number.isFinite(fileSize) &&
    fileSize > 0
  ) {
    return Math.floor(fileSize);
  }
  if (typeof fileSize === 'string' && fileSize.trim()) {
    const parsed = Number(fileSize);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }
  return undefined;
}
export function shouldSkipAttachmentPreviewForLargeFile(
  this: ChatBoxServiceDelegateContext,
  fileSizeBytes?: number,
): boolean {
  return (
    typeof fileSizeBytes === 'number' &&
    fileSizeBytes > this.constructor.ATTACHMENT_PREVIEW_MAX_RENDER_BYTES
  );
}
export function toDateOrUndefined(
  this: ChatBoxServiceDelegateContext,
  value?: Date | string,
): Date | undefined {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
export function resolveAttachmentDocumentType(
  this: ChatBoxServiceDelegateContext,
  params: {
    extension?: string;
    mimeType?: string;
  },
): ChatAttachmentDocumentType {
  const extension = (params.extension || '').toLowerCase();
  const mime = (params.mimeType || '').toLowerCase();

  if (extension === 'pdf' || mime.includes('application/pdf')) {
    return 'pdf';
  }
  if (
    extension === 'doc' ||
    extension === 'docx' ||
    mime.includes('application/msword') ||
    mime.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
  ) {
    return 'word';
  }
  if (
    extension === 'xls' ||
    extension === 'xlsx' ||
    mime.includes('application/vnd.ms-excel') ||
    mime.includes(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
  ) {
    return 'excel';
  }
  if (
    extension === 'ppt' ||
    extension === 'pptx' ||
    mime.includes('application/vnd.ms-powerpoint') ||
    mime.includes(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    )
  ) {
    return 'powerpoint';
  }
  if (
    extension === 'txt' ||
    extension === 'md' ||
    extension === 'csv' ||
    extension === 'json' ||
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/ld+json'
  ) {
    return 'text';
  }
  if (
    extension === 'zip' ||
    extension === 'rar' ||
    extension === '7z' ||
    mime.includes('application/zip') ||
    mime.includes('application/x-rar') ||
    mime.includes('application/x-7z')
  ) {
    return 'archive';
  }
  return 'unknown';
}
export function buildOfficeEmbedPreviewUrl(
  this: ChatBoxServiceDelegateContext,
  fileUrl: string,
): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    fileUrl,
  )}`;
}
export function buildAttachmentThumbnailVariants(
  this: ChatBoxServiceDelegateContext,
  thumbnailUrl?: string,
): {
  thumbnailUrlSmall?: string;
  thumbnailUrlMedium?: string;
} {
  if (!thumbnailUrl || !this.isHttpUrl(thumbnailUrl)) {
    return {};
  }

  return {
    thumbnailUrlSmall: this.tryBuildImageKitTransformationUrl(
      thumbnailUrl,
      this.constructor.ATTACHMENT_THUMBNAIL_SMALL_TRANSFORM,
    ),
    thumbnailUrlMedium: this.tryBuildImageKitTransformationUrl(
      thumbnailUrl,
      this.constructor.ATTACHMENT_THUMBNAIL_MEDIUM_TRANSFORM,
    ),
  };
}
export function buildAttachmentPreviewVersion(
  this: ChatBoxServiceDelegateContext,
  params: {
    previewStatus?: ChatAttachmentPreviewStatus;
    previewUpdatedAt?: Date;
    thumbnailUrl?: string;
    previewUrl?: string;
    previewErrorCode?: string;
    previewAssetSource?: ChatAttachmentPreviewAssetSource;
  },
): string | undefined {
  if (!params.previewStatus) {
    return undefined;
  }

  const payload = [
    params.previewStatus,
    params.previewUpdatedAt?.toISOString() || '',
    params.thumbnailUrl || '',
    params.previewUrl || '',
    params.previewErrorCode || '',
    params.previewAssetSource || '',
  ].join('|');
  return Buffer.from(payload, 'utf8').toString('base64url');
}
export function resolveAttachmentPreviewAssetSource(
  this: ChatBoxServiceDelegateContext,
  params: {
    attachmentType: ChatAttachmentType;
    documentType: ChatAttachmentDocumentType;
    previewStatus?: ChatAttachmentPreviewStatus;
    thumbnailUrl?: string;
  },
): ChatAttachmentPreviewAssetSource {
  const thumbnailUrl = params.thumbnailUrl?.trim();
  if (!thumbnailUrl) {
    return 'none';
  }
  if (thumbnailUrl.startsWith('data:image/svg+xml')) {
    return 'fallback';
  }
  if (
    params.attachmentType === ChatAttachmentType.IMAGE ||
    params.attachmentType === ChatAttachmentType.VIDEO
  ) {
    return 'derived';
  }
  if (params.documentType === 'pdf') {
    return /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(thumbnailUrl)
      ? 'rendered'
      : 'derived';
  }
  if (params.previewStatus === 'ready') {
    return 'rendered';
  }
  return 'none';
}
export function isHttpUrl(
  this: ChatBoxServiceDelegateContext,
  value: string,
): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
export function tryBuildImageKitTransformationUrl(
  this: ChatBoxServiceDelegateContext,
  fileUrl: string,
  transform: string,
): string | undefined {
  try {
    const parsed = new URL(fileUrl);
    const current = parsed.searchParams.get('tr');
    if (current) {
      parsed.searchParams.set('tr', `${current},${transform}`);
    } else {
      parsed.searchParams.set('tr', transform);
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}
export function getFileExtension(
  this: ChatBoxServiceDelegateContext,
  fileNameOrUrl?: string,
): string | undefined {
  if (!fileNameOrUrl) {
    return undefined;
  }

  let source = fileNameOrUrl;
  try {
    source = new URL(fileNameOrUrl).pathname;
  } catch {
    // keep raw source
  }
  const raw = source.split('/').pop();
  if (!raw || !raw.includes('.')) {
    return undefined;
  }
  return raw.split('.').pop()?.toLowerCase();
}
export function enqueueAttachmentPreviewJob(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    messageId: string;
    attachmentId: string;
    actorUserId: string;
  },
): void {
  const job: AttachmentPreviewJob = {
    organizationId: params.organizationId,
    roomId: params.roomId,
    messageId: params.messageId,
    attachmentId: params.attachmentId,
    actorUserId: params.actorUserId,
    attempt: 0,
    runAfter: Date.now(),
  };
  void this.chatBackgroundQueueService.enqueueAttachmentPreviewJob(job).catch(
    (error: Error) => {
      this.logger.warn(
        `Failed to enqueue attachment preview job ${params.attachmentId}: ${error.message}`,
      );
    },
  );
  this.attachmentPreviewMetrics.queued += 1;
}
export async function processAttachmentPreviewQueue(
  this: ChatBoxServiceDelegateContext,
): Promise<void> {
  if (this.attachmentPreviewWorkerBusy) {
    return;
  }

  this.attachmentPreviewWorkerBusy = true;
  let claimedJob:
    | {
        jobId: string;
        lockToken: string;
        job: AttachmentPreviewJob;
      }
    | undefined;
  try {
    const claimed =
      await this.chatBackgroundQueueService.claimDueAttachmentPreviewJobs({
        limit: this.constructor.ATTACHMENT_PREVIEW_QUEUE_CLAIM_BATCH_SIZE,
        lockTtlMs: this.constructor.ATTACHMENT_PREVIEW_QUEUE_JOB_LOCK_TTL_MS,
      });
    if (claimed.length === 0) {
      return;
    }
    const claimedItem = claimed[0];
    claimedJob = claimedItem;
    const job = claimedItem.job;

    await this.processSingleAttachmentPreviewJob(job);
    this.attachmentPreviewMetrics.processed += 1;
  } catch (error) {
    this.attachmentPreviewMetrics.failed += 1;
    const job = claimedJob?.job;
    if (!job) {
      return;
    }
    const nextAttempt = job.attempt + 1;
    const resolution = this.resolveAttachmentPreviewError(error);
    if (
      resolution.permanent ||
      nextAttempt > this.constructor.ATTACHMENT_PREVIEW_MAX_RETRIES
    ) {
      await this.chatBackgroundQueueService.moveAttachmentPreviewToDeadLetter({
        job: { ...job, attempt: nextAttempt },
        reason: resolution.code,
      });
      this.attachmentPreviewMetrics.deadLettered += 1;
      await this.markAttachmentPreviewFailed(job, resolution.code);
      this.logger.warn(
        `Attachment preview moved to dead-letter after ${job.attempt} retries: ${job.attachmentId} (${resolution.code})`,
      );
    } else {
      this.attachmentPreviewMetrics.retried += 1;
      const delayMs = Math.min(
        1_000 * 2 ** nextAttempt,
        this.constructor.ATTACHMENT_PREVIEW_MAX_RETRY_DELAY_MS,
      );
      await this.chatBackgroundQueueService.enqueueAttachmentPreviewJob({
        ...job,
        attempt: nextAttempt,
        runAfter: Date.now() + delayMs,
      });
    }

    this.logger.warn(
      `Attachment preview retry scheduled (attempt ${nextAttempt}) for ${job.attachmentId}: ${resolution.code}`,
    );
  } finally {
    if (claimedJob) {
      await this.chatBackgroundQueueService.releaseAttachmentPreviewClaim({
        attachmentId: claimedJob.jobId,
        lockToken: claimedJob.lockToken,
      });
    }
    this.attachmentPreviewWorkerBusy = false;
    this.cleanupAttachmentPreviewResultCache();
  }
}
export async function processSingleAttachmentPreviewJob(
  this: ChatBoxServiceDelegateContext,
  job: AttachmentPreviewJob,
): Promise<void> {
  const attachment = await this.attachmentRepo.findOne({
    where: {
      id: job.attachmentId,
      organizationId: job.organizationId,
    },
  });
  if (!attachment) {
    return;
  }

  const documentType =
    attachment.documentType ||
    this.resolveAttachmentDocumentType({
      extension: this.getFileExtension(
        attachment.fileName || attachment.fileUrl,
      ),
      mimeType: attachment.mimeType,
    });

  if (!this.supportsAsyncDocumentPreview(documentType)) {
    return;
  }

  if (
    attachment.previewStatus === 'ready' &&
    typeof attachment.previewThumbnailUrl === 'string' &&
    attachment.previewThumbnailUrl.length > 0
  ) {
    return;
  }

  const cacheKey = this.buildAttachmentPreviewCacheKey(attachment);
  const cachedResult = this.getCachedAttachmentPreviewResult(cacheKey);
  if (cachedResult) {
    this.attachmentPreviewMetrics.cacheHits += 1;
    await this.applyAttachmentPreviewResult({
      job,
      attachment,
      result: cachedResult,
    });
    return;
  }
  this.attachmentPreviewMetrics.cacheMisses += 1;

  const result = await this.resolveAsyncDocumentAttachmentPreview(attachment);
  this.setCachedAttachmentPreviewResult(cacheKey, result);
  await this.applyAttachmentPreviewResult({
    job,
    attachment,
    result,
  });
}
export function supportsAsyncDocumentPreview(
  this: ChatBoxServiceDelegateContext,
  documentType: ChatAttachmentDocumentType,
): boolean {
  return (
    documentType === 'word' ||
    documentType === 'excel' ||
    documentType === 'powerpoint' ||
    documentType === 'pdf' ||
    documentType === 'text'
  );
}
export function buildAttachmentPreviewCacheKey(
  this: ChatBoxServiceDelegateContext,
  attachment: ChatMessageAttachment,
): string {
  const checksum = attachment.checksum?.trim();
  if (checksum) {
    return `chat:attachment-preview:checksum:${checksum.toLowerCase()}`;
  }
  return `chat:attachment-preview:file:${attachment.fileUrl}`;
}
export function getCachedAttachmentPreviewResult(
  this: ChatBoxServiceDelegateContext,
  cacheKey: string,
): AttachmentPreviewResult | null {
  const cached = this.attachmentPreviewResultCache.get(cacheKey);
  if (!cached) {
    return null;
  }
  if (cached.expiresAt <= Date.now()) {
    this.attachmentPreviewResultCache.delete(cacheKey);
    return null;
  }
  return cached.result;
}
export function setCachedAttachmentPreviewResult(
  this: ChatBoxServiceDelegateContext,
  cacheKey: string,
  result: AttachmentPreviewResult,
): void {
  this.attachmentPreviewResultCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + this.constructor.ATTACHMENT_PREVIEW_CACHE_TTL_MS,
  });
}
export function cleanupAttachmentPreviewResultCache(
  this: ChatBoxServiceDelegateContext,
): void {
  if (this.attachmentPreviewResultCache.size === 0) {
    return;
  }
  const now = Date.now();
  for (const [cacheKey, entry] of this.attachmentPreviewResultCache.entries()) {
    if (entry.expiresAt <= now) {
      this.attachmentPreviewResultCache.delete(cacheKey);
    }
  }
}
export async function applyAttachmentPreviewResult(
  this: ChatBoxServiceDelegateContext,
  params: {
    job: AttachmentPreviewJob;
    attachment: ChatMessageAttachment;
    result: AttachmentPreviewResult;
  },
): Promise<void> {
  const now = new Date();
  params.attachment.previewStatus = 'ready';
  params.attachment.previewThumbnailUrl = params.result.thumbnailUrl;
  params.attachment.previewUrl =
    params.result.previewUrl || params.attachment.previewUrl;
  params.attachment.previewWidth = params.result.previewWidth;
  params.attachment.previewHeight = params.result.previewHeight;
  params.attachment.previewPage =
    params.result.previewPage ?? params.attachment.previewPage ?? 1;
  params.attachment.pageCount = params.result.pageCount;
  params.attachment.previewErrorCode = undefined;
  params.attachment.previewUpdatedAt = now;
  const saved = await this.attachmentRepo.save(params.attachment);
  const attachmentResponse = this.toMessageAttachmentResponse(saved);
  this.emitAttachmentPreviewUpdatedEvent({
    organizationId: params.job.organizationId,
    roomId: params.job.roomId,
    messageId: params.job.messageId,
    actorUserId: params.job.actorUserId,
    attachment: attachmentResponse,
  });
}
export async function markAttachmentPreviewFailed(
  this: ChatBoxServiceDelegateContext,
  job: AttachmentPreviewJob,
  errorCode: string,
): Promise<void> {
  const attachment = await this.attachmentRepo.findOne({
    where: {
      id: job.attachmentId,
      organizationId: job.organizationId,
    },
  });
  if (!attachment) {
    return;
  }

  attachment.previewStatus = 'failed';
  attachment.previewErrorCode = errorCode;
  attachment.previewUpdatedAt = new Date();
  const saved = await this.attachmentRepo.save(attachment);
  const attachmentResponse = this.toMessageAttachmentResponse(saved);
  this.emitAttachmentPreviewUpdatedEvent({
    organizationId: job.organizationId,
    roomId: job.roomId,
    messageId: job.messageId,
    actorUserId: job.actorUserId,
    attachment: attachmentResponse,
  });
}
export async function resolveAsyncDocumentAttachmentPreview(
  this: ChatBoxServiceDelegateContext,
  attachment: ChatMessageAttachment,
): Promise<AttachmentPreviewResult> {
  const documentType =
    attachment.documentType ||
    this.resolveAttachmentDocumentType({
      extension: this.getFileExtension(attachment.fileName),
      mimeType: attachment.mimeType,
    });

  if (documentType === 'pdf') {
    const renderedPdfPreview = await this.tryResolveOfficePreviewFromRenderer({
      fileUrl: attachment.fileUrl,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    });
    if (renderedPdfPreview) {
      return {
        thumbnailUrl: renderedPdfPreview.thumbnailUrl,
        previewUrl: renderedPdfPreview.previewUrl || attachment.fileUrl,
        previewWidth: renderedPdfPreview.previewWidth,
        previewHeight: renderedPdfPreview.previewHeight,
        previewPage: renderedPdfPreview.previewPage ?? 1,
        pageCount: renderedPdfPreview.pageCount,
      };
    }

    const pdfPreview = await this.tryResolvePdfPreviewAsset(attachment);
    if (pdfPreview) {
      return pdfPreview;
    }
    throw new Error('preview_image_unavailable');
  }

  if (
    documentType === 'text' ||
    this.isTextPreviewFile({
      extension: this.getFileExtension(attachment.fileName),
      mimeType: attachment.mimeType,
    })
  ) {
    const renderedTextPreview = await this.tryResolveOfficePreviewFromRenderer({
      fileUrl: attachment.fileUrl,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    });
    if (renderedTextPreview) {
      return {
        thumbnailUrl: renderedTextPreview.thumbnailUrl,
        previewUrl: renderedTextPreview.previewUrl || attachment.fileUrl,
        previewWidth: renderedTextPreview.previewWidth,
        previewHeight: renderedTextPreview.previewHeight,
        previewPage: renderedTextPreview.previewPage ?? 1,
        pageCount: renderedTextPreview.pageCount,
      };
    }

    if (!this.constructor.OFFICE_PREVIEW_RENDERER_ENDPOINT) {
      throw new Error('preview_renderer_not_configured');
    }

    throw new Error('preview_renderer_unavailable');
  }

  const officeEmbedUrl =
    attachment.previewUrl ||
    this.buildOfficeEmbedPreviewUrl(attachment.fileUrl);
  const rendered = await this.tryResolveOfficePreviewFromRenderer({
    fileUrl: attachment.fileUrl,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
  });
  if (rendered) {
    return {
      thumbnailUrl: rendered.thumbnailUrl,
      previewUrl: rendered.previewUrl || officeEmbedUrl,
      previewWidth: rendered.previewWidth,
      previewHeight: rendered.previewHeight,
      previewPage: rendered.previewPage ?? 1,
      pageCount: rendered.pageCount,
    };
  }

  if (!this.constructor.OFFICE_PREVIEW_RENDERER_ENDPOINT) {
    throw new Error('preview_renderer_not_configured');
  }

  throw new Error('preview_renderer_unavailable');
}
export async function tryResolveOfficePreviewFromRenderer(
  this: ChatBoxServiceDelegateContext,
  params: {
    fileUrl: string;
    fileName?: string;
    mimeType?: string;
  },
): Promise<AttachmentPreviewResult | null> {
  const endpoint = this.constructor.OFFICE_PREVIEW_RENDERER_ENDPOINT;
  if (!endpoint) {
    return null;
  }

  const requestUrl = new URL(endpoint);
  requestUrl.searchParams.set('fileUrl', params.fileUrl);
  if (params.fileName) {
    requestUrl.searchParams.set('fileName', params.fileName);
  }
  if (params.mimeType) {
    requestUrl.searchParams.set('mimeType', params.mimeType);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, this.constructor.ATTACHMENT_PREVIEW_RENDER_TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'ICCP-ChatAttachmentPreviewBot/1.0',
      },
    });
    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as Record<string, unknown>;
    const thumbnailUrl =
      typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl : undefined;
    const previewUrl =
      typeof body.previewUrl === 'string' ? body.previewUrl : undefined;
    if (!thumbnailUrl && !previewUrl) {
      return null;
    }

    return {
      thumbnailUrl,
      previewUrl,
      previewWidth: this.toPositiveInteger(body.previewWidth),
      previewHeight: this.toPositiveInteger(body.previewHeight),
      previewPage: this.toPositiveInteger(body.previewPage),
      pageCount: this.toPositiveInteger(body.pageCount),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
export async function tryResolvePdfPreviewAsset(
  this: ChatBoxServiceDelegateContext,
  attachment: ChatMessageAttachment,
): Promise<AttachmentPreviewResult | null> {
  const transformedUrl = this.tryBuildImageKitTransformationUrl(
    attachment.fileUrl,
    'pg-1,w-480',
  );
  if (!transformedUrl) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, this.constructor.ATTACHMENT_PREVIEW_RENDER_TIMEOUT_MS);

  try {
    const response = await fetch(transformedUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'user-agent': 'ICCP-ChatAttachmentPreviewBot/1.0',
      },
    });
    if (!response.ok) {
      return null;
    }

    const contentType = (response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!contentType.startsWith('image/')) {
      return null;
    }

    return {
      thumbnailUrl: transformedUrl,
      previewUrl: attachment.fileUrl,
      previewPage: 1,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
export function toPositiveInteger(
  this: ChatBoxServiceDelegateContext,
  value: unknown,
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  if (value <= 0) {
    return undefined;
  }
  return Math.floor(value);
}
export function buildGenericDocumentThumbnailDataUrl(
  this: ChatBoxServiceDelegateContext,
  params: {
    fileName?: string;
    documentType: ChatAttachmentDocumentType;
  },
): string {
  const extension = (
    this.getFileExtension(params.fileName) || 'file'
  ).toUpperCase();
  const label = this.resolveDocumentTypeLabel(params.documentType);
  const normalizedName = (params.fileName || 'Document').trim();
  const safeName = this.escapeSvgText(
    normalizedName.length > 48
      ? `${normalizedName.slice(0, 45)}...`
      : normalizedName,
  );
  const safeLabel = this.escapeSvgText(label);
  const safeExtension = this.escapeSvgText(extension);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><rect x="32" y="28" width="576" height="304" rx="18" fill="#0b1220" stroke="#334155" stroke-width="2"/><rect x="56" y="52" width="118" height="34" rx="10" fill="#1d4ed8"/><text x="115" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#ffffff" font-weight="700">${safeExtension}</text><text x="56" y="130" font-family="Arial, sans-serif" font-size="28" fill="#f8fafc" font-weight="700">${safeLabel}</text><text x="56" y="170" font-family="Arial, sans-serif" font-size="20" fill="#cbd5e1">${safeName}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
export function resolveDocumentTypeLabel(
  this: ChatBoxServiceDelegateContext,
  documentType: ChatAttachmentDocumentType,
): string {
  switch (documentType) {
    case 'word':
      return 'Word Document';
    case 'excel':
      return 'Spreadsheet';
    case 'powerpoint':
      return 'Presentation';
    case 'pdf':
      return 'PDF Document';
    default:
      return 'Document';
  }
}
export function escapeSvgText(
  this: ChatBoxServiceDelegateContext,
  value: string,
): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export function resolveAttachmentPreviewError(
  this: ChatBoxServiceDelegateContext,
  error: unknown,
): AttachmentPreviewErrorResolution {
  const code =
    error instanceof Error && error.message
      ? error.message
      : 'preview_generation_failed';
  if (code === 'preview_renderer_not_configured') {
    return {
      code,
      permanent: true,
    };
  }
  if (code === 'preview_file_too_large') {
    return {
      code,
      permanent: true,
    };
  }
  if (
    code === 'preview_renderer_unavailable' ||
    code === 'preview_image_unavailable'
  ) {
    return {
      code,
      permanent: false,
    };
  }
  return {
    code: 'preview_generation_failed',
    permanent: false,
  };
}
export function flushAttachmentPreviewMetrics(
  this: ChatBoxServiceDelegateContext,
): void {
  if (
    this.attachmentPreviewMetrics.queued === 0 &&
    this.attachmentPreviewMetrics.processed === 0 &&
    this.attachmentPreviewMetrics.failed === 0 &&
    this.attachmentPreviewMetrics.retried === 0 &&
    this.attachmentPreviewMetrics.deadLettered === 0 &&
    this.attachmentPreviewMetrics.cacheHits === 0 &&
    this.attachmentPreviewMetrics.cacheMisses === 0
  ) {
    return;
  }

  this.logger.log(
    `Attachment preview worker metrics: queue=redis-shared deadLetter=redis-shared queued=${this.attachmentPreviewMetrics.queued} processed=${this.attachmentPreviewMetrics.processed} failed=${this.attachmentPreviewMetrics.failed} retried=${this.attachmentPreviewMetrics.retried} deadLettered=${this.attachmentPreviewMetrics.deadLettered} cacheHits=${this.attachmentPreviewMetrics.cacheHits} cacheMisses=${this.attachmentPreviewMetrics.cacheMisses}`,
  );

  this.attachmentPreviewMetrics.queued = 0;
  this.attachmentPreviewMetrics.processed = 0;
  this.attachmentPreviewMetrics.failed = 0;
  this.attachmentPreviewMetrics.retried = 0;
  this.attachmentPreviewMetrics.deadLettered = 0;
  this.attachmentPreviewMetrics.cacheHits = 0;
  this.attachmentPreviewMetrics.cacheMisses = 0;
}
export function detectAttachmentTypeByMime(
  this: ChatBoxServiceDelegateContext,
  mimeType?: string,
): ChatAttachmentType | null {
  if (!mimeType) {
    return null;
  }

  const normalized = mimeType.toLowerCase();
  if (normalized.startsWith(this.constructor.IMAGE_MIME_PREFIX)) {
    return ChatAttachmentType.IMAGE;
  }
  if (normalized.startsWith(this.constructor.VIDEO_MIME_PREFIX)) {
    return ChatAttachmentType.VIDEO;
  }
  if (normalized.startsWith(this.constructor.AUDIO_MIME_PREFIX)) {
    return ChatAttachmentType.AUDIO;
  }
  return ChatAttachmentType.FILE;
}
export function detectAttachmentTypeFromFileName(
  this: ChatBoxServiceDelegateContext,
  fileName?: string,
): ChatAttachmentType | null {
  const extension = this.getFileExtension(fileName);
  if (!extension) {
    return null;
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
    return ChatAttachmentType.IMAGE;
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
    return ChatAttachmentType.VIDEO;
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension)) {
    return ChatAttachmentType.AUDIO;
  }
  return ChatAttachmentType.FILE;
}
export function assertAttachmentUploadPolicy(
  this: ChatBoxServiceDelegateContext,
  params: {
    attachmentType: ChatAttachmentType;
    mimeType?: string;
    fileName?: string;
    fileSize?: number;
  },
): void {
  const extension = this.getFileExtension(params.fileName);
  if (
    extension &&
    !this.constructor.ALLOWED_FILE_EXTENSIONS.has(extension.toLowerCase())
  ) {
    throw new BadRequestException(
      `Unsupported file extension: .${extension.toLowerCase()}`,
    );
  }

  const normalizedMime = (params.mimeType || '').toLowerCase();
  if (normalizedMime) {
    if (
      params.attachmentType === ChatAttachmentType.IMAGE &&
      !normalizedMime.startsWith(this.constructor.IMAGE_MIME_PREFIX)
    ) {
      throw new BadRequestException(
        'attachmentType image requires image/* mime',
      );
    }
    if (
      params.attachmentType === ChatAttachmentType.VIDEO &&
      !normalizedMime.startsWith(this.constructor.VIDEO_MIME_PREFIX)
    ) {
      throw new BadRequestException(
        'attachmentType video requires video/* mime',
      );
    }
    if (
      params.attachmentType === ChatAttachmentType.AUDIO &&
      !normalizedMime.startsWith(this.constructor.AUDIO_MIME_PREFIX)
    ) {
      throw new BadRequestException(
        'attachmentType audio requires audio/* mime',
      );
    }
  }

  if (typeof params.fileSize === 'number' && Number.isFinite(params.fileSize)) {
    const maxBytes =
      this.constructor.MAX_UPLOAD_FILE_SIZE_BYTES_BY_TYPE[
        params.attachmentType
      ];
    if (params.fileSize > maxBytes) {
      throw new BadRequestException(
        `File size exceeds limit for ${params.attachmentType}. maxBytes=${maxBytes}`,
      );
    }
  }
}
export function buildUploadIdempotencyKey(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    roomId: string;
    messageId: string;
    userId: string;
    clientUploadId?: string;
  },
): string | undefined {
  const clientUploadId = params.clientUploadId?.trim();
  if (!clientUploadId) {
    return undefined;
  }
  return `chat:attachment:upload-idem:${params.organizationId}:${params.roomId}:${params.messageId}:${params.userId}:${clientUploadId}`;
}
export async function findIdempotentAttachment(
  this: ChatBoxServiceDelegateContext,
  idempotencyKey: string,
): Promise<MessageAttachmentResponse | null> {
  const attachmentId = (await this.cacheService.get(idempotencyKey)) as
    | string
    | null;
  if (!attachmentId) {
    return null;
  }

  const attachment = await this.attachmentRepo.findOne({
    where: { id: attachmentId },
  });
  if (!attachment) {
    return null;
  }

  return this.toMessageAttachmentResponse(attachment);
}
export async function cacheIdempotentAttachment(
  this: ChatBoxServiceDelegateContext,
  idempotencyKey: string,
  attachmentId: string,
): Promise<void> {
  await this.cacheService.set(
    idempotencyKey,
    attachmentId,
    7 * 24 * 60 * 60 * 1000,
  );
}
export function encodeRoomMessageCursor(
  this: ChatBoxServiceDelegateContext,
  params: {
    sentAt: Date | string;
    id: string;
  },
): string {
  const payload = JSON.stringify({
    sentAt:
      params.sentAt instanceof Date
        ? params.sentAt.toISOString()
        : new Date(params.sentAt).toISOString(),
    id: params.id,
  });
  return Buffer.from(payload, 'utf8').toString('base64url');
}
export function decodeRoomMessageCursor(
  this: ChatBoxServiceDelegateContext,
  cursor?: string,
): { sentAt: string; id: string } | null {
  if (!cursor) {
    return null;
  }
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as { sentAt?: string; id?: string };
    if (!parsed.sentAt || !parsed.id) {
      return null;
    }

    const sentAt = new Date(parsed.sentAt);
    if (Number.isNaN(sentAt.getTime())) {
      return null;
    }

    return {
      sentAt: sentAt.toISOString(),
      id: parsed.id,
    };
  } catch {
    return null;
  }
}
export function detectAttachmentType(
  this: ChatBoxServiceDelegateContext,
  mimeType?: string,
): ChatAttachmentType {
  return this.detectAttachmentTypeByMime(mimeType) || ChatAttachmentType.FILE;
}
