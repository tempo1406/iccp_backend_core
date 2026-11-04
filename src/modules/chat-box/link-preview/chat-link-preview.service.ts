import { CacheService } from '@modules/cache/cache.service';
import {
  CHAT_BOX_EVENTS,
  ChatMessageLinkPreviewUpdatedDomainEvent,
} from '@modules/chat-box/delegates/constants/chat-box-events.constant';
import {
  ChatLinkPreviewAssetSource,
  ChatLinkPreviewAssetStatus,
  ChatLinkPreviewStatus,
  ChatLinkPreviewType,
  LinkPreviewResponse,
} from '@modules/chat-box/message-management/dto/response/link-preview.response';
import { ChatMessage } from '@modules/chat-box/message-management/entities/message.entity';
import { ImageKitService } from '@modules/imagekit/imagekit.service';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Repository } from 'typeorm';

type ResolvePreviewResult = {
  preview: LinkPreviewResponse | null;
  fromCache: boolean;
};

type EnqueuePreviewJobsParams = {
  organizationId: string;
  roomId: string;
  messageId: string;
  actorUserId: string;
  urls: string[];
};

type LinkUnfurlJob = {
  jobId: string;
  organizationId: string;
  roomId: string;
  messageId: string;
  actorUserId: string;
  url: string;
  attempt: number;
  nextAttemptAt: number;
};

type LinkPreviewMetrics = {
  queued: number;
  processed: number;
  success: number;
  cacheHit: number;
  failed: number;
  deadLetter: number;
  totalFetchMs: number;
};

type GoogleThumbnailAssetCacheItem = {
  body: Buffer;
  contentType: string;
  etag: string;
  cacheControl: string;
  assetStatus: ChatLinkPreviewAssetStatus;
  assetSource: ChatLinkPreviewAssetSource;
  expiresAt: number;
};

@Injectable()
export class ChatLinkPreviewService implements OnModuleInit, OnModuleDestroy {
  private static readonly MAX_URLS_PER_MESSAGE = 5;
  private static readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  private static readonly WORKER_INTERVAL_MS = 1_000;
  private static readonly MAX_RETRIES = 3;
  private static readonly MAX_REDIRECTS = 3;
  private static readonly MAX_HTML_BYTES = 512_000;
  private static readonly MAX_METRICS_LOG_WINDOW_MS = 60_000;
  private static readonly GOOGLE_THUMBNAIL_DEFAULT_SIZE = 'w1200';
  private static readonly GOOGLE_THUMBNAIL_MIN_SIZE = 120;
  private static readonly GOOGLE_THUMBNAIL_MAX_SIZE = 2_048;
  private static readonly GOOGLE_THUMBNAIL_TIMEOUT_MS = 4_500;
  private static readonly GOOGLE_THUMBNAIL_MAX_BYTES = 3 * 1024 * 1024;
  private static readonly GOOGLE_THUMBNAIL_CACHE_TTL_MS = 30 * 60 * 1000;
  private static readonly GOOGLE_THUMBNAIL_FALLBACK_CACHE_TTL_MS =
    5 * 60 * 1000;
  private static readonly GOOGLE_THUMBNAIL_MAX_CACHE_ITEMS = 600;
  private static readonly GOOGLE_EXPORT_PDF_MAX_BYTES = 10 * 1024 * 1024;

  private readonly logger = new Logger(ChatLinkPreviewService.name);
  private readonly jobQueue = new Map<string, LinkUnfurlJob>();
  private readonly deadLetterJobs: LinkUnfurlJob[] = [];
  private readonly metrics: LinkPreviewMetrics = {
    queued: 0,
    processed: 0,
    success: 0,
    cacheHit: 0,
    failed: 0,
    deadLetter: 0,
    totalFetchMs: 0,
  };
  private readonly googleThumbnailAssetCache = new Map<
    string,
    GoogleThumbnailAssetCacheItem
  >();
  private workerTimer?: NodeJS.Timeout;
  private metricsLogTimer?: NodeJS.Timeout;

  constructor(
    private readonly cacheService: CacheService,
    private readonly imagekitService: ImageKitService,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit(): void {
    this.workerTimer = setInterval(() => {
      void this.processQueue();
    }, ChatLinkPreviewService.WORKER_INTERVAL_MS);

    this.metricsLogTimer = setInterval(() => {
      this.flushMetricsLog();
    }, ChatLinkPreviewService.MAX_METRICS_LOG_WINDOW_MS);
  }

  onModuleDestroy(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = undefined;
    }
    if (this.metricsLogTimer) {
      clearInterval(this.metricsLogTimer);
      this.metricsLogTimer = undefined;
    }
  }

  extractUrls(content?: string): string[] {
    const normalized = content?.trim();
    if (!normalized) {
      return [];
    }

    const regex = /\bhttps?:\/\/[^\s<>"'`]+/gi;
    const matches = normalized.match(regex) || [];
    if (matches.length === 0) {
      return [];
    }

    const urls = new Set<string>();
    for (const raw of matches) {
      const cleaned = this.normalizeDetectedUrl(raw);
      if (!cleaned) {
        continue;
      }
      urls.add(cleaned);
      if (urls.size >= ChatLinkPreviewService.MAX_URLS_PER_MESSAGE) {
        break;
      }
    }

    return Array.from(urls);
  }

  async resolveUrlList(params: {
    urls: string[];
    eagerFetch?: boolean;
    eagerFetchLimit?: number;
  }): Promise<{
    resolved: LinkPreviewResponse[];
    pendingUrls: string[];
  }> {
    const uniqueUrls = Array.from(new Set(params.urls)).slice(
      0,
      ChatLinkPreviewService.MAX_URLS_PER_MESSAGE,
    );
    const resolved: LinkPreviewResponse[] = [];
    const pendingUrls: string[] = [];

    const eagerFetch = params.eagerFetch ?? true;
    let eagerSlots = Math.max(0, params.eagerFetchLimit ?? 2);

    for (const url of uniqueUrls) {
      const cached = await this.getCachedPreview(url);
      if (cached) {
        this.metrics.cacheHit += 1;
        resolved.push(cached);
        continue;
      }

      if (!eagerFetch || eagerSlots <= 0) {
        pendingUrls.push(url);
        continue;
      }

      eagerSlots -= 1;
      const eagerResult = await this.resolvePreview(url, 1_200);
      if (eagerResult.preview) {
        resolved.push(eagerResult.preview);
      } else {
        pendingUrls.push(url);
      }
    }

    return {
      resolved: resolved.slice(0, ChatLinkPreviewService.MAX_URLS_PER_MESSAGE),
      pendingUrls: pendingUrls.slice(
        0,
        ChatLinkPreviewService.MAX_URLS_PER_MESSAGE,
      ),
    };
  }

  enqueuePreviewJobs(params: EnqueuePreviewJobsParams): void {
    for (const url of params.urls.slice(
      0,
      ChatLinkPreviewService.MAX_URLS_PER_MESSAGE,
    )) {
      const jobId = this.buildJobId({
        messageId: params.messageId,
        url,
      });
      if (this.jobQueue.has(jobId)) {
        continue;
      }

      this.jobQueue.set(jobId, {
        jobId,
        organizationId: params.organizationId,
        roomId: params.roomId,
        messageId: params.messageId,
        actorUserId: params.actorUserId,
        url,
        attempt: 0,
        nextAttemptAt: Date.now(),
      });
      this.metrics.queued += 1;
    }
  }

  normalizePreviewAssetForResponse(
    preview: LinkPreviewResponse,
  ): LinkPreviewResponse {
    const provider = preview.provider;
    const inferredGoogleMeta = this.resolveGoogleDocsProvider(preview.url);
    const isGoogleProvider =
      provider === 'google_docs' ||
      provider === 'google_sheets' ||
      provider === 'google_slides' ||
      provider === 'google_drive' ||
      provider === 'google_drive_file' ||
      Boolean(inferredGoogleMeta);
    if (!isGoogleProvider) {
      return preview;
    }

    const fileId =
      this.normalizeGoogleFileId(preview.previewAssetId) ||
      this.normalizeGoogleFileId(inferredGoogleMeta?.fileId) ||
      this.extractGoogleThumbnailFileId(preview.previewImageUrl) ||
      this.extractGoogleThumbnailFileId(preview.thumbnailUrl) ||
      this.extractGoogleThumbnailFileId(preview.imageUrl);
    if (!fileId) {
      const previewAssetStatus = preview.previewAssetStatus || 'failed';
      const previewAssetSource = preview.previewAssetSource || 'external';
      return {
        ...preview,
        previewAssetStatus,
        previewAssetSource,
        previewVersion:
          preview.previewVersion ||
          this.buildLinkPreviewVersion({
            ...preview,
            previewAssetStatus,
            previewAssetSource,
          }),
      };
    }

    const size = this.extractGoogleThumbnailSize(preview.previewImageUrl);
    const assetUrl = this.buildGoogleThumbnailProxyUrl(fileId, size);
    if (
      preview.previewAssetSource === 'rendered' &&
      preview.previewImageUrl &&
      !this.extractGoogleThumbnailFileId(preview.previewImageUrl)
    ) {
      const previewAssetStatus = preview.previewAssetStatus || 'ready';
      return {
        ...preview,
        provider: preview.provider || inferredGoogleMeta?.provider,
        providerName: preview.providerName || inferredGoogleMeta?.providerName,
        previewAssetId: fileId,
        previewAssetStatus,
        previewAssetSource: 'rendered',
        previewAssetErrorCode: preview.previewAssetErrorCode,
        previewVersion:
          preview.previewVersion ||
          this.buildLinkPreviewVersion({
            ...preview,
            previewAssetId: fileId,
            previewAssetStatus,
            previewAssetSource: 'rendered',
          }),
      };
    }
    const previewAssetStatus = preview.previewAssetStatus || 'pending';
    const previewAssetSource = preview.previewAssetSource || 'proxied';
    const previewAssetErrorCode =
      preview.previewAssetErrorCode ||
      (previewAssetStatus === 'failed'
        ? 'google_thumbnail_unavailable'
        : undefined);
    return {
      ...preview,
      provider: preview.provider || inferredGoogleMeta?.provider,
      providerName: preview.providerName || inferredGoogleMeta?.providerName,
      imageUrl: assetUrl,
      thumbnailUrl: assetUrl,
      previewImageUrl: assetUrl,
      previewImageAlt:
        preview.previewImageAlt ||
        `Preview of ${preview.resourceTitle || preview.title || 'Google file'}`,
      previewAssetId: fileId,
      previewAssetStatus,
      previewAssetSource,
      previewAssetErrorCode,
      previewVersion:
        preview.previewVersion ||
        this.buildLinkPreviewVersion({
          ...preview,
          previewImageUrl: assetUrl,
          imageUrl: assetUrl,
          thumbnailUrl: assetUrl,
          previewAssetId: fileId,
          previewAssetStatus,
          previewAssetSource,
          previewAssetErrorCode,
        }),
    };
  }

  async getGoogleThumbnailAsset(params: {
    fileId: string;
    size?: string;
    ifNoneMatch?: string;
  }): Promise<{
    notModified: boolean;
    body?: Buffer;
    contentType?: string;
    etag: string;
    cacheControl: string;
    assetStatus: ChatLinkPreviewAssetStatus;
    assetSource: ChatLinkPreviewAssetSource;
  }> {
    const fileId = this.normalizeGoogleFileId(params.fileId);
    if (!fileId) {
      const fallback = this.buildGoogleThumbnailFallback({
        fileId: 'unknown',
        size: ChatLinkPreviewService.GOOGLE_THUMBNAIL_DEFAULT_SIZE,
      });
      return this.toAssetResponse({
        ...fallback,
        ifNoneMatch: params.ifNoneMatch,
      });
    }

    const size = this.normalizeGoogleThumbnailSize(params.size);
    const cacheKey = this.buildGoogleThumbnailCacheKey(fileId, size);
    const now = Date.now();
    const cached = this.googleThumbnailAssetCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      const assetSource =
        cached.assetSource === 'fallback' ? 'fallback' : 'cached';
      return this.toAssetResponse({
        body: cached.body,
        contentType: cached.contentType,
        cacheControl: cached.cacheControl,
        assetStatus: cached.assetStatus,
        assetSource,
        ifNoneMatch: params.ifNoneMatch,
      });
    }
    if (cached && cached.expiresAt <= now) {
      this.googleThumbnailAssetCache.delete(cacheKey);
    }

    const fetched = await this.fetchGoogleThumbnailImage({
      fileId,
      size,
    });
    const resolved =
      fetched || this.buildGoogleThumbnailFallback({ fileId, size });
    const ttlMs =
      resolved.assetStatus === 'ready'
        ? ChatLinkPreviewService.GOOGLE_THUMBNAIL_CACHE_TTL_MS
        : ChatLinkPreviewService.GOOGLE_THUMBNAIL_FALLBACK_CACHE_TTL_MS;
    this.setGoogleThumbnailCache(cacheKey, {
      body: resolved.body,
      contentType: resolved.contentType,
      cacheControl: resolved.cacheControl,
      assetStatus: resolved.assetStatus,
      assetSource: resolved.assetSource,
      ttlMs,
    });

    return this.toAssetResponse({
      ...resolved,
      ifNoneMatch: params.ifNoneMatch,
    });
  }

  private async processQueue(): Promise<void> {
    const now = Date.now();
    const dueJobs = Array.from(this.jobQueue.values())
      .filter((job) => job.nextAttemptAt <= now)
      .slice(0, 5);

    if (dueJobs.length === 0) {
      return;
    }

    for (const job of dueJobs) {
      await this.processJob(job);
    }
  }

  private async processJob(job: LinkUnfurlJob): Promise<void> {
    this.metrics.processed += 1;
    const startedAt = Date.now();

    try {
      const result = await this.resolvePreview(job.url, 4_500);
      this.metrics.totalFetchMs += Date.now() - startedAt;

      if (!result.preview) {
        throw new Error('Link preview unavailable');
      }

      const updated = await this.appendPreviewToMessage({
        organizationId: job.organizationId,
        roomId: job.roomId,
        messageId: job.messageId,
        actorUserId: job.actorUserId,
        preview: result.preview,
      });

      this.jobQueue.delete(job.jobId);
      if (updated) {
        this.metrics.success += 1;
      }
    } catch (error) {
      this.metrics.failed += 1;
      const nextAttempt = job.attempt + 1;
      if (nextAttempt > ChatLinkPreviewService.MAX_RETRIES) {
        this.jobQueue.delete(job.jobId);
        this.deadLetterJobs.push(job);
        this.metrics.deadLetter += 1;
        await this.markPreviewFailed({
          organizationId: job.organizationId,
          roomId: job.roomId,
          messageId: job.messageId,
          actorUserId: job.actorUserId,
          failedUrl: job.url,
        });
        this.logger.warn(
          `Link preview moved to dead-letter after ${job.attempt} retries: ${job.url}`,
        );
        return;
      }

      const backoffMs = Math.min(20_000, 1_500 * 2 ** nextAttempt);
      this.jobQueue.set(job.jobId, {
        ...job,
        attempt: nextAttempt,
        nextAttemptAt: Date.now() + backoffMs,
      });
      this.logger.warn(
        `Link preview retry scheduled (attempt ${nextAttempt}) for ${job.url}: ${(error as Error).message}`,
      );
    }
  }

  private async appendPreviewToMessage(params: {
    organizationId: string;
    roomId: string;
    messageId: string;
    actorUserId: string;
    preview: LinkPreviewResponse;
  }): Promise<boolean> {
    const message = await this.messageRepo.findOne({
      where: {
        id: params.messageId,
        organizationId: params.organizationId,
        roomId: params.roomId,
      },
    });
    if (!message || message.isDeleted) {
      return false;
    }

    const metadata: Record<string, any> = {
      ...(message.metadata ?? {}),
    };
    const existing = this.ensurePreviewArray(metadata.linkPreviews);
    if (existing.some((item) => item.url === params.preview.url)) {
      return false;
    }

    const next = [...existing, params.preview].slice(
      0,
      ChatLinkPreviewService.MAX_URLS_PER_MESSAGE,
    );
    const pendingUrls = this.ensureStringArray(
      metadata.linkPreviewPendingUrls,
    ).filter((url) => url !== params.preview.url);
    const failedUrls = this.ensureStringArray(
      metadata.linkPreviewFailedUrls,
    ).filter((url) => url !== params.preview.url);
    const nextStatus = this.computeLinkPreviewStatus({
      resolvedCount: next.length,
      pendingCount: pendingUrls.length,
      failedCount: failedUrls.length,
    });

    metadata.linkPreviews = next;
    metadata.linkPreviewStatus = nextStatus;
    metadata.linkPreviewPendingUrls = pendingUrls;
    metadata.linkPreviewFailedUrls = failedUrls;
    metadata.linkPreviewVersion = 'v2';

    await this.messageRepo.update(
      {
        id: params.messageId,
        organizationId: params.organizationId,
        roomId: params.roomId,
      },
      { metadata },
    );

    const event: ChatMessageLinkPreviewUpdatedDomainEvent = {
      organizationId: params.organizationId,
      roomId: params.roomId,
      messageId: params.messageId,
      actorUserId: params.actorUserId,
      linkPreviews: next,
      metadata: {
        linkPreviewStatus: nextStatus,
        linkPreviewPendingUrls: pendingUrls,
        linkPreviewFailedUrls: failedUrls,
        linkPreviewVersion:
          typeof metadata.linkPreviewVersion === 'string'
            ? metadata.linkPreviewVersion
            : undefined,
      },
      occurredAt: new Date().toISOString(),
    };
    this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_LINK_PREVIEW_UPDATED, event);
    return true;
  }

  private async markPreviewFailed(params: {
    organizationId: string;
    roomId: string;
    messageId: string;
    actorUserId: string;
    failedUrl: string;
  }): Promise<void> {
    const message = await this.messageRepo.findOne({
      where: {
        id: params.messageId,
        organizationId: params.organizationId,
        roomId: params.roomId,
      },
    });
    if (!message || message.isDeleted) {
      return;
    }

    const metadata: Record<string, any> = {
      ...(message.metadata ?? {}),
    };
    const linkPreviews = this.ensurePreviewArray(metadata.linkPreviews);
    const pendingUrls = this.ensureStringArray(
      metadata.linkPreviewPendingUrls,
    ).filter((url) => url !== params.failedUrl);
    const failedSet = new Set(
      this.ensureStringArray(metadata.linkPreviewFailedUrls),
    );
    failedSet.add(params.failedUrl);
    const failedUrls = Array.from(failedSet);
    const nextStatus = this.computeLinkPreviewStatus({
      resolvedCount: linkPreviews.length,
      pendingCount: pendingUrls.length,
      failedCount: failedUrls.length,
    });

    metadata.linkPreviewStatus = nextStatus;
    metadata.linkPreviewPendingUrls = pendingUrls;
    metadata.linkPreviewFailedUrls = failedUrls;
    metadata.linkPreviewVersion = 'v2';

    await this.messageRepo.update(
      {
        id: params.messageId,
        organizationId: params.organizationId,
        roomId: params.roomId,
      },
      { metadata },
    );

    const event: ChatMessageLinkPreviewUpdatedDomainEvent = {
      organizationId: params.organizationId,
      roomId: params.roomId,
      messageId: params.messageId,
      actorUserId: params.actorUserId,
      linkPreviews,
      metadata: {
        linkPreviewStatus: nextStatus,
        linkPreviewPendingUrls: pendingUrls,
        linkPreviewFailedUrls: failedUrls,
        linkPreviewVersion: 'v2',
      },
      occurredAt: new Date().toISOString(),
    };
    this.eventEmitter.emit(CHAT_BOX_EVENTS.MESSAGE_LINK_PREVIEW_UPDATED, event);
  }

  private async getCachedPreview(
    url: string,
  ): Promise<LinkPreviewResponse | null> {
    const key = this.buildCacheKey(url);
    try {
      const cached = await this.cacheService.get<LinkPreviewResponse>(key);
      if (!cached) {
        return null;
      }
      return this.normalizePreviewAssetForResponse(cached);
    } catch {
      return null;
    }
  }

  private async setCachedPreview(
    url: string,
    preview: LinkPreviewResponse,
  ): Promise<void> {
    try {
      const normalized = this.normalizePreviewAssetForResponse(preview);
      await this.cacheService.set(
        this.buildCacheKey(url),
        normalized,
        ChatLinkPreviewService.CACHE_TTL_MS,
      );
    } catch {
      // cache failure should not block message flow
    }
  }

  private async resolvePreview(
    rawUrl: string,
    timeoutMs: number,
  ): Promise<ResolvePreviewResult> {
    const url = this.normalizeDetectedUrl(rawUrl);
    if (!url) {
      return { preview: null, fromCache: false };
    }

    const cached = await this.getCachedPreview(url);
    if (cached) {
      this.metrics.cacheHit += 1;
      return { preview: cached, fromCache: true };
    }

    const preview = await this.fetchAndBuildPreview(url, timeoutMs);
    if (!preview) {
      return { preview: null, fromCache: false };
    }

    await this.setCachedPreview(url, preview);
    return { preview, fromCache: false };
  }

  private async fetchAndBuildPreview(
    rawUrl: string,
    timeoutMs: number,
  ): Promise<LinkPreviewResponse | null> {
    const safeUrl = this.normalizeDetectedUrl(rawUrl);
    if (!safeUrl) {
      return null;
    }

    const special = await this.buildSpecialProviderPreview(safeUrl);
    if (special) {
      return special;
    }

    const response = await this.safeFetchWithRedirects(safeUrl, timeoutMs);
    if (!response) {
      return null;
    }

    const finalUrl = response.finalUrl;
    const contentType = (response.contentType || '').toLowerCase();
    const fetchedAt = new Date().toISOString();

    if (this.looksLikeImage(finalUrl, contentType)) {
      return this.toRichPreview({
        url: finalUrl,
        title: this.extractFileName(finalUrl) || 'Image',
        resourceTitle: this.extractFileName(finalUrl) || 'Image',
        resourceType: 'image',
        resourceTypeLabel: 'Image link preview',
        type: 'image',
        mediaType: 'image',
        imageUrl: finalUrl,
        thumbnailUrl: finalUrl,
        previewImageUrl: finalUrl,
        previewImageAlt: `Preview of ${this.extractFileName(finalUrl) || 'image'}`,
        mimeType: response.contentType,
        contentType: response.contentType,
        fetchedAt,
      });
    }

    if (this.looksLikeBinaryFile(finalUrl, contentType)) {
      return this.toRichPreview({
        url: finalUrl,
        title: this.extractFileName(finalUrl) || 'File',
        resourceTitle: this.extractFileName(finalUrl) || 'File',
        resourceType: 'file',
        resourceTypeLabel: 'File preview',
        type: 'file',
        mediaType: 'file',
        mimeType: response.contentType,
        contentType: response.contentType,
        fetchedAt,
      });
    }

    if (!contentType.includes('text/html') || !response.body) {
      return this.toRichPreview({
        url: finalUrl,
        title: this.extractDomain(finalUrl),
        resourceTitle: this.extractDomain(finalUrl),
        resourceType: 'website',
        resourceTypeLabel: 'Website preview',
        type: 'website',
        mediaType: 'website',
        provider: this.extractProviderFromUrl(finalUrl),
        providerName: this.extractDomain(finalUrl),
        providerIconUrl: this.buildProviderIconUrl(
          this.extractProviderFromUrl(finalUrl),
          finalUrl,
        ),
        mimeType: response.contentType,
        contentType: response.contentType,
        fetchedAt,
      });
    }

    const html = response.body;
    const title =
      this.extractMetaTag(html, 'property', 'og:title') ||
      this.extractMetaTag(html, 'name', 'twitter:title') ||
      this.extractHtmlTitle(html) ||
      this.extractDomain(finalUrl);
    const description =
      this.extractMetaTag(html, 'property', 'og:description') ||
      this.extractMetaTag(html, 'name', 'description') ||
      this.extractMetaTag(html, 'name', 'twitter:description') ||
      undefined;
    const imageUrl = this.resolveImageUrl(
      finalUrl,
      this.extractMetaTag(html, 'property', 'og:image') ||
        this.extractMetaTag(html, 'name', 'twitter:image'),
    );
    const siteName =
      this.extractMetaTag(html, 'property', 'og:site_name') ||
      this.extractDomain(finalUrl);

    return this.toRichPreview({
      url: finalUrl,
      title,
      resourceTitle: title,
      resourceType: 'website',
      resourceTypeLabel: 'Website preview',
      description,
      excerpt: description,
      imageUrl,
      thumbnailUrl: imageUrl,
      previewImageUrl: imageUrl,
      previewImageAlt: imageUrl ? `Preview of ${title}` : undefined,
      type: 'website',
      mediaType: 'website',
      siteName,
      provider: this.extractProviderFromUrl(finalUrl),
      providerName: siteName || this.extractDomain(finalUrl),
      providerIconUrl: this.buildProviderIconUrl(
        this.extractProviderFromUrl(finalUrl),
        finalUrl,
      ),
      mimeType: response.contentType,
      contentType: response.contentType,
      fetchedAt,
    });
  }

  private async safeFetchWithRedirects(
    rawUrl: string,
    timeoutMs: number,
  ): Promise<{
    finalUrl: string;
    contentType?: string;
    body?: string;
  } | null> {
    let currentUrl = rawUrl;
    let redirectCount = 0;

    while (redirectCount <= ChatLinkPreviewService.MAX_REDIRECTS) {
      if (!(await this.isSafePublicUrl(currentUrl))) {
        return null;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'user-agent': 'ICCP-ChatLinkPreviewBot/1.0',
            accept:
              'text/html,application/xhtml+xml,application/xml,image/*,video/*,application/pdf,*/*;q=0.8',
          },
        });

        const status = response.status;
        if (status >= 300 && status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            return null;
          }

          currentUrl = new URL(location, currentUrl).toString();
          redirectCount += 1;
          continue;
        }

        if (status >= 400) {
          return null;
        }

        const contentType = response.headers.get('content-type') || undefined;
        const contentLengthValue = response.headers.get('content-length');
        if (contentLengthValue) {
          const contentLength = Number(contentLengthValue);
          if (
            Number.isFinite(contentLength) &&
            contentLength > ChatLinkPreviewService.MAX_HTML_BYTES
          ) {
            return {
              finalUrl: currentUrl,
              contentType,
            };
          }
        }

        const lowerContentType = (contentType || '').toLowerCase();
        if (!lowerContentType.includes('text/html')) {
          return {
            finalUrl: currentUrl,
            contentType,
          };
        }

        const text = await response.text();
        const trimmed = text.slice(0, ChatLinkPreviewService.MAX_HTML_BYTES);
        return {
          finalUrl: currentUrl,
          contentType,
          body: trimmed,
        };
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    }

    return null;
  }

  private async isSafePublicUrl(rawUrl: string): Promise<boolean> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return false;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local')
    ) {
      return false;
    }

    const directIpType = isIP(host);
    if (directIpType > 0 && this.isPrivateOrReservedIp(host)) {
      return false;
    }

    try {
      const addresses = await lookup(host, { all: true });
      if (addresses.length === 0) {
        return false;
      }
      return !addresses.some((address) =>
        this.isPrivateOrReservedIp(address.address),
      );
    } catch {
      return false;
    }
  }

  private isPrivateOrReservedIp(ip: string): boolean {
    const version = isIP(ip);
    if (version === 4) {
      const [a, b] = ip.split('.').map((item) => Number(item));
      if (a === 10 || a === 127 || a === 0) {
        return true;
      }
      if (a === 169 && b === 254) {
        return true;
      }
      if (a === 172 && b >= 16 && b <= 31) {
        return true;
      }
      if (a === 192 && b === 168) {
        return true;
      }
      if (a >= 224) {
        return true;
      }
      return false;
    }

    if (version === 6) {
      const normalized = ip.toLowerCase();
      return (
        normalized === '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:') ||
        normalized.startsWith('::ffff:127.') ||
        normalized.startsWith('::ffff:10.') ||
        normalized.startsWith('::ffff:192.168.') ||
        normalized.startsWith('::ffff:172.')
      );
    }

    return true;
  }

  private async buildSpecialProviderPreview(
    url: string,
  ): Promise<LinkPreviewResponse | null> {
    const internalReference = this.parseTeamChatMessageReference(url);
    if (internalReference) {
      return this.toRichPreview({
        url,
        canonicalUrl: internalReference.canonicalUrl,
        title: 'Team chat message',
        resourceTitle: 'Team chat message',
        description: 'Open this message in Team Chat',
        excerpt: 'Internal message link',
        type: 'document',
        mediaType: 'document',
        provider: 'team_chat',
        providerName: 'Team Chat',
        siteName: 'Team Chat',
        resourceType: 'team_chat_message',
        resourceTypeLabel: 'Team chat message',
        internalReference: {
          kind: 'team_chat_message',
          roomId: internalReference.roomId,
          messageId: internalReference.messageId,
          deepLinkUrl: internalReference.deepLinkUrl,
        },
        fetchedAt: new Date().toISOString(),
      });
    }

    const youtubeId = this.extractYoutubeVideoId(url);
    if (youtubeId) {
      return this.toRichPreview({
        url,
        canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
        title: 'YouTube video',
        resourceTitle: 'YouTube video',
        description: 'Video link',
        imageUrl: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
        thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
        previewImageUrl: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
        previewImageAlt: 'YouTube video thumbnail',
        type: 'video',
        mediaType: 'video',
        provider: 'youtube',
        providerName: 'YouTube',
        providerIconUrl:
          'https://www.youtube.com/s/desktop/6f8f0f31/img/favicon_32x32.png',
        siteName: 'YouTube',
        resourceType: 'video',
        resourceTypeLabel: 'Video preview',
        embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
        fetchedAt: new Date().toISOString(),
      });
    }

    if (this.isVimeoUrl(url)) {
      return this.toRichPreview({
        url,
        title: 'Vimeo video',
        resourceTitle: 'Vimeo video',
        description: 'Video link',
        type: 'video',
        mediaType: 'video',
        provider: 'vimeo',
        providerName: 'Vimeo',
        providerIconUrl: 'https://vimeo.com/favicon.ico',
        siteName: 'Vimeo',
        resourceType: 'video',
        resourceTypeLabel: 'Video preview',
        fetchedAt: new Date().toISOString(),
      });
    }

    const googleMeta = this.resolveGoogleDocsProvider(url);
    if (googleMeta) {
      let previewAssetStatus: ChatLinkPreviewAssetStatus = googleMeta.fileId
        ? 'pending'
        : 'failed';
      let previewAssetSource: ChatLinkPreviewAssetSource = googleMeta.fileId
        ? 'proxied'
        : 'external';
      let previewAssetErrorCode = googleMeta.fileId
        ? undefined
        : 'google_file_id_missing';
      let thumbnailUrl = googleMeta.fileId
        ? this.buildGoogleThumbnailProxyUrl(googleMeta.fileId)
        : undefined;

      if (googleMeta.fileId) {
        const asset = await this.getGoogleThumbnailAsset({
          fileId: googleMeta.fileId,
        });
        previewAssetStatus = asset.assetStatus;
        previewAssetSource = asset.assetSource;
        previewAssetErrorCode =
          asset.assetStatus === 'ready'
            ? undefined
            : 'google_thumbnail_unavailable';
        if (asset.assetStatus !== 'ready') {
          const renderedPreviewUrl =
            await this.tryResolveGoogleWorkspaceRenderedPreviewUrl({
              url,
              fileId: googleMeta.fileId,
              provider: googleMeta.provider,
            });
          if (renderedPreviewUrl) {
            thumbnailUrl = renderedPreviewUrl;
            previewAssetStatus = 'ready';
            previewAssetSource = 'rendered';
            previewAssetErrorCode = undefined;
          }
        }
      }

      return this.toRichPreview({
        url,
        title: googleMeta.defaultTitle,
        resourceTitle: googleMeta.defaultTitle,
        description: 'Shared from Google Workspace',
        type: 'document',
        mediaType: 'document',
        provider: googleMeta.provider,
        providerName: googleMeta.providerName,
        providerIconUrl: this.buildProviderIconUrl(googleMeta.provider, url),
        siteName: 'Google Workspace',
        resourceType: googleMeta.resourceType,
        resourceTypeLabel: googleMeta.resourceTypeLabel,
        imageUrl: thumbnailUrl,
        thumbnailUrl,
        previewImageUrl: thumbnailUrl,
        previewImageAlt: thumbnailUrl
          ? `Preview of ${googleMeta.defaultTitle}`
          : undefined,
        mimeType: googleMeta.mimeType,
        previewAssetId: googleMeta.fileId,
        previewAssetStatus,
        previewAssetSource,
        previewAssetErrorCode,
        fetchedAt: new Date().toISOString(),
      });
    }

    if (this.looksLikeImage(url)) {
      const fileName = this.extractFileName(url) || 'Image';
      return this.toRichPreview({
        url,
        title: fileName,
        resourceTitle: fileName,
        resourceType: 'image',
        resourceTypeLabel: 'Image link preview',
        type: 'image',
        mediaType: 'image',
        imageUrl: url,
        thumbnailUrl: url,
        previewImageUrl: url,
        previewImageAlt: `Preview of ${fileName}`,
        fetchedAt: new Date().toISOString(),
      });
    }

    if (this.looksLikeBinaryFile(url)) {
      const fileName = this.extractFileName(url) || 'File';
      return this.toRichPreview({
        url,
        title: fileName,
        resourceTitle: fileName,
        resourceType: 'file',
        resourceTypeLabel: 'File preview',
        type: 'file',
        mediaType: 'file',
        fetchedAt: new Date().toISOString(),
      });
    }

    return null;
  }

  private resolveGoogleDocsProvider(url: string): {
    provider: string;
    providerName: string;
    resourceType: string;
    resourceTypeLabel: string;
    defaultTitle: string;
    mimeType: string;
    fileId?: string;
  } | null {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host !== 'docs.google.com' && host !== 'drive.google.com') {
        return null;
      }

      const lowerPath = parsed.pathname.toLowerCase();
      const fileId = this.extractGoogleFileId(parsed);
      if (lowerPath.includes('/document/')) {
        return {
          provider: 'google_docs',
          providerName: 'Google Docs',
          resourceType: 'google_doc',
          resourceTypeLabel: 'Document in Google Docs',
          defaultTitle: 'Google Docs document',
          mimeType: 'application/vnd.google-apps.document',
          fileId,
        };
      }
      if (lowerPath.includes('/spreadsheets/')) {
        return {
          provider: 'google_sheets',
          providerName: 'Google Sheets',
          resourceType: 'google_sheet',
          resourceTypeLabel: 'Spreadsheet in Google Sheets',
          defaultTitle: 'Google Sheets spreadsheet',
          mimeType: 'application/vnd.google-apps.spreadsheet',
          fileId,
        };
      }
      if (lowerPath.includes('/presentation/')) {
        return {
          provider: 'google_slides',
          providerName: 'Google Slides',
          resourceType: 'google_slide',
          resourceTypeLabel: 'Presentation in Google Slides',
          defaultTitle: 'Google Slides presentation',
          mimeType: 'application/vnd.google-apps.presentation',
          fileId,
        };
      }
      if (lowerPath.includes('/file/')) {
        return {
          provider: 'google_drive_file',
          providerName: 'Google Drive',
          resourceType: 'google_drive_file',
          resourceTypeLabel: 'File in Google Drive',
          defaultTitle: 'Google Drive file',
          mimeType: 'application/octet-stream',
          fileId,
        };
      }
      return {
        provider: 'google_drive',
        providerName: 'Google Drive',
        resourceType: 'google_drive',
        resourceTypeLabel: 'File in Google Drive',
        defaultTitle: 'Google Drive file',
        mimeType: 'application/octet-stream',
        fileId,
      };
    } catch {
      return null;
    }
  }

  private async tryResolveGoogleWorkspaceRenderedPreviewUrl(params: {
    url: string;
    fileId: string;
    provider: string;
  }): Promise<string | null> {
    const exportPdfUrl = this.buildGoogleWorkspaceExportPdfUrl(params);
    if (!exportPdfUrl) {
      return null;
    }

    const pdfBuffer = await this.fetchGoogleWorkspaceExportPdf(exportPdfUrl);
    if (!pdfBuffer) {
      return null;
    }

    try {
      const uploaded = await this.imagekitService.uploadBuffer({
        buffer: pdfBuffer,
        fileName: `google-preview-${params.fileId}.pdf`,
        folder: 'chat/google-workspace-previews',
      });
      const previewUrl = this.buildImageTransformationUrl(
        uploaded.url,
        'pg-1,w-1200',
      );
      if (!previewUrl) {
        return null;
      }

      const isRenderable = await this.probeImageUrl(previewUrl);
      return isRenderable ? previewUrl : null;
    } catch {
      return null;
    }
  }

  private buildGoogleWorkspaceExportPdfUrl(params: {
    url: string;
    fileId: string;
    provider: string;
  }): string | null {
    switch (params.provider) {
      case 'google_docs':
        return `https://docs.google.com/document/d/${encodeURIComponent(params.fileId)}/export?format=pdf`;
      case 'google_sheets':
        return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(params.fileId)}/export?format=pdf`;
      case 'google_slides':
        return `https://docs.google.com/presentation/d/${encodeURIComponent(params.fileId)}/export/pdf`;
      default:
        return null;
    }
  }

  private async fetchGoogleWorkspaceExportPdf(
    url: string,
  ): Promise<Buffer | null> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      ChatLinkPreviewService.GOOGLE_THUMBNAIL_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          accept: 'application/pdf,*/*;q=0.8',
          'user-agent': 'ICCP-ChatLinkPreviewExportBot/1.0',
        },
      });
      if (!response.ok) {
        return null;
      }

      const contentType = (response.headers.get('content-type') || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      if (contentType && !contentType.includes('application/pdf')) {
        return null;
      }

      const contentLengthRaw = response.headers.get('content-length');
      if (contentLengthRaw) {
        const contentLength = Number(contentLengthRaw);
        if (
          Number.isFinite(contentLength) &&
          contentLength > ChatLinkPreviewService.GOOGLE_EXPORT_PDF_MAX_BYTES
        ) {
          return null;
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      if (
        arrayBuffer.byteLength <= 0 ||
        arrayBuffer.byteLength >
          ChatLinkPreviewService.GOOGLE_EXPORT_PDF_MAX_BYTES
      ) {
        return null;
      }

      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildImageTransformationUrl(
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

  private async probeImageUrl(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      ChatLinkPreviewService.GOOGLE_THUMBNAIL_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'user-agent': 'ICCP-ChatLinkPreviewProbeBot/1.0',
        },
      });
      if (!response.ok) {
        return false;
      }
      const contentType = (response.headers.get('content-type') || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      return contentType.startsWith('image/');
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractYoutubeVideoId(url: string): string | null {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host === 'youtu.be') {
        return parsed.pathname.replace(/^\/+/, '').slice(0, 64) || null;
      }
      if (host.endsWith('youtube.com')) {
        const id = parsed.searchParams.get('v');
        if (id) {
          return id.slice(0, 64);
        }
        const match = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
        if (match?.[1]) {
          return match[1].slice(0, 64);
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private isVimeoUrl(url: string): boolean {
    try {
      return new URL(url).hostname.toLowerCase().endsWith('vimeo.com');
    } catch {
      return false;
    }
  }

  private extractMetaTag(
    html: string,
    keyType: 'property' | 'name',
    keyValue: string,
  ): string | undefined {
    const pattern = new RegExp(
      `<meta[^>]*${keyType}\\s*=\\s*["']${this.escapeRegex(keyValue)}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`,
      'i',
    );
    const matched = html.match(pattern);
    return matched?.[1]?.trim();
  }

  private extractHtmlTitle(html: string): string | undefined {
    const matched = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return matched?.[1]?.replace(/\s+/g, ' ').trim();
  }

  private resolveImageUrl(baseUrl: string, image?: string): string | undefined {
    if (!image) {
      return undefined;
    }
    try {
      return new URL(image, baseUrl).toString();
    } catch {
      return undefined;
    }
  }

  private looksLikeImage(url: string, contentType?: string): boolean {
    const ct = (contentType || '').toLowerCase();
    if (ct.startsWith('image/')) {
      return true;
    }
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url);
  }

  private looksLikeBinaryFile(url: string, contentType?: string): boolean {
    const ct = (contentType || '').toLowerCase();
    if (
      ct.includes('application/pdf') ||
      ct.includes('application/msword') ||
      ct.includes(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ) ||
      ct.includes(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ) ||
      ct.includes(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      )
    ) {
      return true;
    }

    return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|zip|rar)(\?.*)?$/i.test(
      url,
    );
  }

  private extractFileName(url: string): string | undefined {
    try {
      const parsed = new URL(url);
      const raw = parsed.pathname.split('/').pop();
      return raw ? decodeURIComponent(raw) : undefined;
    } catch {
      return undefined;
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'website';
    }
  }

  private parseTeamChatMessageReference(rawUrl: string): {
    roomId: string;
    messageId: string;
    deepLinkUrl: string;
    canonicalUrl: string;
  } | null {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      const basePath = this.extractTeamChatBasePath(parsed.pathname);
      if (!basePath) {
        return null;
      }

      const roomId = parsed.searchParams.get('roomId')?.trim() || '';
      const messageId = parsed.searchParams.get('messageId')?.trim() || '';
      if (!this.isUuidV4(roomId) || !this.isUuidV4(messageId)) {
        return null;
      }

      const deepLinkUrl = `${basePath}?roomId=${encodeURIComponent(roomId)}&messageId=${encodeURIComponent(messageId)}`;
      const canonicalUrl = new URL(deepLinkUrl, parsed.origin).toString();
      return {
        roomId,
        messageId,
        deepLinkUrl,
        canonicalUrl,
      };
    } catch {
      return null;
    }
  }

  private extractTeamChatBasePath(pathname: string): string | null {
    const segments = pathname
      .split('/')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (segments.length === 0) {
      return null;
    }

    const teamChatIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === 'team-chat',
    );
    if (teamChatIndex < 0) {
      return null;
    }

    const resolved = segments.slice(0, teamChatIndex + 1);
    return `/${resolved.join('/')}`;
  }

  private isUuidV4(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private normalizeDetectedUrl(raw: string): string | null {
    const trimmed = raw.trim().replace(/[)\],.!?;:]+$/g, '');
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return null;
    }
  }

  private buildCacheKey(url: string): string {
    return `chat:link-preview:${encodeURIComponent(url)}`;
  }

  private buildJobId(params: { messageId: string; url: string }): string {
    return `${params.messageId}:${encodeURIComponent(params.url)}`;
  }

  private computeLinkPreviewStatus(params: {
    resolvedCount: number;
    pendingCount: number;
    failedCount: number;
  }): ChatLinkPreviewStatus {
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

  private toRichPreview(
    preview: Partial<LinkPreviewResponse> & {
      url: string;
      title: string;
      type: ChatLinkPreviewType;
      fetchedAt: string;
    },
  ): LinkPreviewResponse {
    const canonicalUrl =
      preview.canonicalUrl ||
      this.normalizeDetectedUrl(preview.url) ||
      preview.url;
    const provider =
      preview.provider || this.extractProviderFromUrl(canonicalUrl);
    const providerName =
      preview.providerName || this.resolveProviderName(provider, canonicalUrl);
    const providerIconUrl =
      preview.providerIconUrl ||
      this.buildProviderIconUrl(provider, canonicalUrl);
    const type = preview.type;
    const mediaType = preview.mediaType || type;
    const resourceType =
      preview.resourceType || this.resolveResourceType(provider, type);
    const resourceTypeLabel =
      preview.resourceTypeLabel ||
      this.resolveResourceTypeLabel(resourceType, type);
    const thumbnailUrl =
      preview.thumbnailUrl || preview.previewImageUrl || preview.imageUrl;
    const previewImageUrl =
      preview.previewImageUrl || preview.thumbnailUrl || preview.imageUrl;

    const builtPreview: LinkPreviewResponse = {
      url: preview.url,
      canonicalUrl,
      displayUrl: preview.displayUrl || this.buildDisplayUrl(canonicalUrl),
      internalReference: preview.internalReference,
      status: preview.status || 'ready',
      provider,
      providerName,
      providerIconUrl,
      siteName: preview.siteName || this.extractDomain(canonicalUrl),
      resourceTitle: preview.resourceTitle || preview.title,
      resourceType,
      resourceTypeLabel,
      title: preview.title,
      description: preview.description,
      excerpt: preview.excerpt || preview.description,
      imageUrl: preview.imageUrl || thumbnailUrl,
      thumbnailUrl,
      previewImageUrl,
      previewImageAlt:
        preview.previewImageAlt ||
        (previewImageUrl
          ? `Preview of ${preview.resourceTitle || preview.title}`
          : undefined),
      previewAssetId: preview.previewAssetId,
      previewAssetStatus: preview.previewAssetStatus,
      previewAssetSource: preview.previewAssetSource,
      previewAssetErrorCode: preview.previewAssetErrorCode,
      previewVersion:
        preview.previewVersion || this.buildLinkPreviewVersion(preview),
      previewImageWidth:
        preview.previewImageWidth ||
        (typeof preview.width === 'number' ? preview.width : undefined),
      previewImageHeight:
        preview.previewImageHeight ||
        (typeof preview.height === 'number' ? preview.height : undefined),
      type,
      mediaType,
      mimeType: preview.mimeType || preview.contentType,
      contentType: preview.contentType || preview.mimeType,
      embedUrl: preview.embedUrl,
      width: preview.width,
      height: preview.height,
      durationMs: preview.durationMs,
      fetchedAt: preview.fetchedAt,
    };

    return this.normalizePreviewAssetForResponse(builtPreview);
  }

  private buildLinkPreviewVersion(
    preview: Partial<LinkPreviewResponse>,
  ): string | undefined {
    const messageSnapshotCreatedAt = preview.internalReference?.messageSnapshot
      ?.createdAt
      ? new Date(preview.internalReference.messageSnapshot.createdAt)
      : undefined;
    const payload = [
      preview.previewAssetId || '',
      preview.previewAssetStatus || '',
      preview.previewAssetSource || '',
      preview.previewAssetErrorCode || '',
      preview.internalReference?.kind || '',
      preview.internalReference?.roomId || '',
      preview.internalReference?.messageId || '',
      preview.internalReference?.deepLinkUrl || '',
      preview.internalReference?.previewState || '',
      preview.internalReference?.roomSnapshot?.id || '',
      preview.internalReference?.roomSnapshot?.roomType || '',
      preview.internalReference?.roomSnapshot?.visibility || '',
      preview.internalReference?.messageSnapshot?.id || '',
      messageSnapshotCreatedAt &&
      !Number.isNaN(messageSnapshotCreatedAt.getTime())
        ? messageSnapshotCreatedAt.toISOString()
        : '',
      preview.previewImageUrl || preview.thumbnailUrl || preview.imageUrl || '',
      preview.fetchedAt || '',
    ].join('|');
    if (!payload.replace(/\|/g, '').trim()) {
      return undefined;
    }
    return Buffer.from(payload, 'utf8').toString('base64url');
  }

  private resolveProviderName(
    provider?: string,
    url?: string,
  ): string | undefined {
    if (!provider) {
      return url ? this.extractDomain(url) : undefined;
    }

    const mapped: Record<string, string> = {
      google_docs: 'Google Docs',
      google_sheets: 'Google Sheets',
      google_slides: 'Google Slides',
      google_drive: 'Google Drive',
      google_drive_file: 'Google Drive',
      team_chat: 'Team Chat',
      youtube: 'YouTube',
      vimeo: 'Vimeo',
    };
    if (mapped[provider]) {
      return mapped[provider];
    }

    const normalized = provider.replace(/[_-]+/g, ' ').trim();
    return normalized
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' ');
  }

  private resolveResourceType(
    provider: string | undefined,
    type: ChatLinkPreviewType,
  ): string {
    if (provider === 'google_docs') {
      return 'google_doc';
    }
    if (provider === 'google_sheets') {
      return 'google_sheet';
    }
    if (provider === 'google_slides') {
      return 'google_slide';
    }
    if (provider === 'google_drive' || provider === 'google_drive_file') {
      return 'google_drive_file';
    }
    if (provider === 'team_chat') {
      return 'team_chat_message';
    }
    if (type === 'image') {
      return 'image';
    }
    if (type === 'video') {
      return 'video';
    }
    if (type === 'file') {
      return 'file';
    }
    if (type === 'document') {
      return 'document';
    }
    return 'website';
  }

  private resolveResourceTypeLabel(
    resourceType: string,
    type: ChatLinkPreviewType,
  ): string {
    const mapped: Record<string, string> = {
      google_doc: 'Document in Google Docs',
      google_sheet: 'Spreadsheet in Google Sheets',
      google_slide: 'Presentation in Google Slides',
      google_drive_file: 'File in Google Drive',
      team_chat_message: 'Team chat message',
      website: 'Website preview',
      image: 'Image link preview',
      video: 'Video preview',
      file: 'File preview',
      document: 'Document preview',
    };
    if (mapped[resourceType]) {
      return mapped[resourceType];
    }
    if (type === 'image') {
      return mapped.image;
    }
    if (type === 'video') {
      return mapped.video;
    }
    if (type === 'file') {
      return mapped.file;
    }
    if (type === 'document') {
      return mapped.document;
    }
    return mapped.website;
  }

  private extractProviderFromUrl(url: string): string | undefined {
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      if (!host) {
        return undefined;
      }
      return host.split('.')[0];
    } catch {
      return undefined;
    }
  }

  private buildProviderIconUrl(
    provider?: string,
    url?: string,
  ): string | undefined {
    if (provider === 'youtube') {
      return 'https://www.youtube.com/s/desktop/6f8f0f31/img/favicon_32x32.png';
    }
    if (provider === 'vimeo') {
      return 'https://vimeo.com/favicon.ico';
    }
    if (
      provider === 'google_docs' ||
      provider === 'google_sheets' ||
      provider === 'google_slides'
    ) {
      return 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=64';
    }
    if (provider === 'google_drive' || provider === 'google_drive_file') {
      return 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64';
    }

    try {
      const host = new URL(url || '').hostname;
      if (!host) {
        return undefined;
      }
      return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
    } catch {
      return undefined;
    }
  }

  private buildDisplayUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.replace(/^www\./, '');
      const path = parsed.pathname === '/' ? '' : parsed.pathname;
      const display = `${host}${path}`;
      return display.length > 220 ? `${display.slice(0, 217)}...` : display;
    } catch {
      return rawUrl;
    }
  }

  private extractGoogleFileId(parsedUrl: URL): string | undefined {
    const queryId = this.normalizeGoogleFileId(
      parsedUrl.searchParams.get('id') || undefined,
    );
    if (queryId) {
      return queryId;
    }

    const pathname = parsedUrl.pathname;
    const directMatch = pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (directMatch?.[1]) {
      return directMatch[1];
    }
    const fileMatch = pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch?.[1]) {
      return fileMatch[1];
    }
    return undefined;
  }

  private extractGoogleThumbnailFileId(url?: string): string | undefined {
    if (!url) {
      return undefined;
    }

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host !== 'drive.google.com') {
        return undefined;
      }
      if (parsed.pathname.toLowerCase() !== '/thumbnail') {
        return undefined;
      }
      return this.normalizeGoogleFileId(
        parsed.searchParams.get('id') || undefined,
      );
    } catch {
      return undefined;
    }
  }

  private extractGoogleThumbnailSize(url?: string): string {
    if (!url) {
      return ChatLinkPreviewService.GOOGLE_THUMBNAIL_DEFAULT_SIZE;
    }

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host !== 'drive.google.com') {
        return ChatLinkPreviewService.GOOGLE_THUMBNAIL_DEFAULT_SIZE;
      }
      const size = parsed.searchParams.get('sz') || undefined;
      return this.normalizeGoogleThumbnailSize(size);
    } catch {
      return ChatLinkPreviewService.GOOGLE_THUMBNAIL_DEFAULT_SIZE;
    }
  }

  private normalizeGoogleFileId(fileId?: string): string | undefined {
    if (!fileId) {
      return undefined;
    }
    const trimmed = fileId.trim();
    if (!/^[a-zA-Z0-9_-]{8,256}$/.test(trimmed)) {
      return undefined;
    }
    return trimmed;
  }

  private normalizeGoogleThumbnailSize(size?: string): string {
    const raw = (size || '').trim().toLowerCase();
    const matched = raw.match(/^w(\d{2,4})$/);
    if (!matched?.[1]) {
      return ChatLinkPreviewService.GOOGLE_THUMBNAIL_DEFAULT_SIZE;
    }

    const width = Number(matched[1]);
    if (!Number.isFinite(width)) {
      return ChatLinkPreviewService.GOOGLE_THUMBNAIL_DEFAULT_SIZE;
    }
    const clamped = Math.min(
      ChatLinkPreviewService.GOOGLE_THUMBNAIL_MAX_SIZE,
      Math.max(ChatLinkPreviewService.GOOGLE_THUMBNAIL_MIN_SIZE, width),
    );
    return `w${clamped}`;
  }

  private buildGoogleThumbnailProxyUrl(fileId: string, size?: string): string {
    const safeFileId = this.normalizeGoogleFileId(fileId);
    if (!safeFileId) {
      return '';
    }
    const safeSize = this.normalizeGoogleThumbnailSize(size);
    return `/api/v1/chat-box/link-previews/google-assets/${encodeURIComponent(safeFileId)}/image?sz=${encodeURIComponent(safeSize)}`;
  }

  private buildGoogleThumbnailCacheKey(fileId: string, size: string): string {
    return `google:${fileId}:${size}`;
  }

  private setGoogleThumbnailCache(
    cacheKey: string,
    payload: {
      body: Buffer;
      contentType: string;
      cacheControl: string;
      assetStatus: ChatLinkPreviewAssetStatus;
      assetSource: ChatLinkPreviewAssetSource;
      ttlMs: number;
    },
  ): GoogleThumbnailAssetCacheItem {
    this.pruneGoogleThumbnailAssetCache();
    const item: GoogleThumbnailAssetCacheItem = {
      body: payload.body,
      contentType: payload.contentType,
      etag: this.buildImageAssetEtag(payload.body, payload.assetStatus),
      cacheControl: payload.cacheControl,
      assetStatus: payload.assetStatus,
      assetSource: payload.assetSource,
      expiresAt: Date.now() + payload.ttlMs,
    };
    this.googleThumbnailAssetCache.set(cacheKey, item);
    return item;
  }

  private pruneGoogleThumbnailAssetCache(): void {
    if (this.googleThumbnailAssetCache.size === 0) {
      return;
    }

    const now = Date.now();
    for (const [key, item] of this.googleThumbnailAssetCache.entries()) {
      if (item.expiresAt <= now) {
        this.googleThumbnailAssetCache.delete(key);
      }
    }

    while (
      this.googleThumbnailAssetCache.size >
      ChatLinkPreviewService.GOOGLE_THUMBNAIL_MAX_CACHE_ITEMS
    ) {
      const oldestKeyResult = this.googleThumbnailAssetCache.keys().next();
      if (oldestKeyResult.done) {
        break;
      }
      this.googleThumbnailAssetCache.delete(oldestKeyResult.value);
    }
  }

  private buildImageAssetEtag(
    body: Buffer,
    assetStatus: ChatLinkPreviewAssetStatus,
  ): string {
    const hash = createHash('sha1').update(body).digest('hex').slice(0, 20);
    return `W/"${assetStatus}-${hash}"`;
  }

  private doesIfNoneMatchHit(
    ifNoneMatch: string | undefined,
    etag: string,
  ): boolean {
    if (!ifNoneMatch) {
      return false;
    }
    const values = ifNoneMatch
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (values.includes('*')) {
      return true;
    }

    const weak = etag.startsWith('W/') ? etag : `W/${etag}`;
    const strong = etag.startsWith('W/') ? etag.slice(2) : etag;
    return values.some(
      (value) => value === etag || value === weak || value === strong,
    );
  }

  private toAssetResponse(params: {
    body: Buffer;
    contentType: string;
    cacheControl: string;
    assetStatus: ChatLinkPreviewAssetStatus;
    assetSource: ChatLinkPreviewAssetSource;
    ifNoneMatch?: string;
    etag?: string;
  }): {
    notModified: boolean;
    body?: Buffer;
    contentType?: string;
    etag: string;
    cacheControl: string;
    assetStatus: ChatLinkPreviewAssetStatus;
    assetSource: ChatLinkPreviewAssetSource;
  } {
    const etag =
      params.etag || this.buildImageAssetEtag(params.body, params.assetStatus);
    if (this.doesIfNoneMatchHit(params.ifNoneMatch, etag)) {
      return {
        notModified: true,
        etag,
        cacheControl: params.cacheControl,
        assetStatus: params.assetStatus,
        assetSource: params.assetSource,
      };
    }
    return {
      notModified: false,
      body: params.body,
      contentType: params.contentType,
      etag,
      cacheControl: params.cacheControl,
      assetStatus: params.assetStatus,
      assetSource: params.assetSource,
    };
  }

  private async fetchGoogleThumbnailImage(params: {
    fileId: string;
    size: string;
  }): Promise<{
    body: Buffer;
    contentType: string;
    cacheControl: string;
    assetStatus: ChatLinkPreviewAssetStatus;
    assetSource: ChatLinkPreviewAssetSource;
  } | null> {
    const url = `https://drive.google.com/thumbnail?id=${encodeURIComponent(params.fileId)}&sz=${encodeURIComponent(params.size)}`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      ChatLinkPreviewService.GOOGLE_THUMBNAIL_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent': 'ICCP-ChatLinkPreviewProxy/1.0',
          accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
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

      const contentLengthRaw = response.headers.get('content-length');
      if (contentLengthRaw) {
        const length = Number(contentLengthRaw);
        if (
          Number.isFinite(length) &&
          length > ChatLinkPreviewService.GOOGLE_THUMBNAIL_MAX_BYTES
        ) {
          return null;
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      if (
        arrayBuffer.byteLength <= 0 ||
        arrayBuffer.byteLength >
          ChatLinkPreviewService.GOOGLE_THUMBNAIL_MAX_BYTES
      ) {
        return null;
      }

      return {
        body: Buffer.from(arrayBuffer),
        contentType: contentType || 'image/jpeg',
        cacheControl: 'private, max-age=1800, stale-while-revalidate=86400',
        assetStatus: 'ready',
        assetSource: 'proxied',
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildGoogleThumbnailFallback(params: {
    fileId: string;
    size: string;
  }): {
    body: Buffer;
    contentType: string;
    cacheControl: string;
    assetStatus: ChatLinkPreviewAssetStatus;
    assetSource: ChatLinkPreviewAssetSource;
  } {
    const width = Number(
      params.size.replace(/^w/, '') ||
        ChatLinkPreviewService.GOOGLE_THUMBNAIL_DEFAULT_SIZE.replace(/^w/, ''),
    );
    const resolvedWidth = Number.isFinite(width)
      ? Math.max(
          320,
          Math.min(width, ChatLinkPreviewService.GOOGLE_THUMBNAIL_MAX_SIZE),
        )
      : 1200;
    const resolvedHeight = Math.round(resolvedWidth * 0.56);
    const shortFileId = this.escapeXml(params.fileId.slice(0, 16));
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${resolvedWidth}" height="${resolvedHeight}" viewBox="0 0 ${resolvedWidth} ${resolvedHeight}" role="img" aria-label="Google file preview fallback">`,
      '<defs>',
      '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
      '<stop offset="0%" stop-color="#0f172a"/>',
      '<stop offset="100%" stop-color="#1e293b"/>',
      '</linearGradient>',
      '</defs>',
      `<rect width="${resolvedWidth}" height="${resolvedHeight}" fill="url(#bg)"/>`,
      `<rect x="${Math.round(resolvedWidth * 0.08)}" y="${Math.round(resolvedHeight * 0.14)}" width="${Math.round(resolvedWidth * 0.84)}" height="${Math.round(resolvedHeight * 0.72)}" rx="18" fill="#111827" stroke="#334155" stroke-width="2"/>`,
      `<circle cx="${Math.round(resolvedWidth * 0.16)}" cy="${Math.round(resolvedHeight * 0.24)}" r="20" fill="#ffffff"/>`,
      `<text x="${Math.round(resolvedWidth * 0.16)}" y="${Math.round(resolvedHeight * 0.24) + 7}" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" fill="#2563eb">G</text>`,
      `<text x="${Math.round(resolvedWidth * 0.22)}" y="${Math.round(resolvedHeight * 0.24) + 6}" font-size="20" font-weight="600" font-family="Arial, sans-serif" fill="#f8fafc">Google Workspace file</text>`,
      `<text x="${Math.round(resolvedWidth * 0.22)}" y="${Math.round(resolvedHeight * 0.24) + 34}" font-size="14" font-family="Arial, sans-serif" fill="#94a3b8">Preview is currently unavailable</text>`,
      `<text x="${Math.round(resolvedWidth * 0.22)}" y="${Math.round(resolvedHeight * 0.24) + 58}" font-size="12" font-family="Arial, sans-serif" fill="#64748b">file id: ${shortFileId}</text>`,
      '</svg>',
    ].join('');

    return {
      body: Buffer.from(svg, 'utf8'),
      contentType: 'image/svg+xml',
      cacheControl: 'private, max-age=120, stale-while-revalidate=600',
      assetStatus: 'failed',
      assetSource: 'fallback',
    };
  }

  private ensurePreviewArray(value: unknown): LinkPreviewResponse[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
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
        const previewState =
          internalReferenceRaw?.previewState === 'ready' ||
          internalReferenceRaw?.previewState === 'forbidden' ||
          internalReferenceRaw?.previewState === 'message_not_found' ||
          internalReferenceRaw?.previewState === 'message_deleted'
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
          this.isUuidV4(roomSnapshotId) &&
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
          typeof messageSnapshotRaw?.id === 'string'
            ? messageSnapshotRaw.id
            : '';
        const messageSnapshotCreatedAt =
          typeof messageSnapshotRaw?.createdAt === 'string' ||
          messageSnapshotRaw?.createdAt instanceof Date
            ? new Date(messageSnapshotRaw.createdAt)
            : undefined;
        const messageSnapshot =
          this.isUuidV4(messageSnapshotId) &&
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
                createdAt:
                  messageSnapshotCreatedAt &&
                  !Number.isNaN(messageSnapshotCreatedAt.getTime())
                    ? messageSnapshotCreatedAt
                    : undefined,
                isDeleted: messageSnapshotRaw.isDeleted,
                hasAttachments: messageSnapshotRaw.hasAttachments,
              }
            : undefined;
        const internalReference =
          internalReferenceRaw?.kind === 'team_chat_message' &&
          this.isUuidV4(internalRoomId) &&
          this.isUuidV4(internalMessageId) &&
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
            typeof row.resourceTitle === 'string'
              ? row.resourceTitle
              : undefined,
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
        return this.normalizePreviewAssetForResponse(normalized);
      })
      .filter((item): item is LinkPreviewResponse => Boolean(item));
  }

  private ensureStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private flushMetricsLog(): void {
    const hasActivity =
      this.metrics.queued > 0 ||
      this.metrics.processed > 0 ||
      this.metrics.success > 0 ||
      this.metrics.failed > 0;
    if (!hasActivity) {
      return;
    }

    this.logger.log(
      `Unfurl metrics | queued=${this.metrics.queued}, processed=${this.metrics.processed}, success=${this.metrics.success}, cacheHit=${this.metrics.cacheHit}, failed=${this.metrics.failed}, deadLetter=${this.metrics.deadLetter}, avgFetchMs=${this.computeAvgFetchMs()}`,
    );
    this.metrics.queued = 0;
    this.metrics.processed = 0;
    this.metrics.success = 0;
    this.metrics.cacheHit = 0;
    this.metrics.failed = 0;
    this.metrics.deadLetter = 0;
    this.metrics.totalFetchMs = 0;
  }

  private computeAvgFetchMs(): number {
    if (this.metrics.processed === 0) {
      return 0;
    }
    return Math.round(this.metrics.totalFetchMs / this.metrics.processed);
  }
}
