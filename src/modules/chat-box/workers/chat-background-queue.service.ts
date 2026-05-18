import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export type ChatAttachmentPreviewQueueJob = {
  organizationId: string;
  roomId: string;
  messageId: string;
  attachmentId: string;
  actorUserId: string;
  attempt: number;
  runAfter: number;
};

export type ChatScheduledMessageQueueJob = {
  organizationId: string;
  scheduledMessageId: string;
  authorUserId: string;
  runAfter: number;
};

type ClaimedJob<T> = {
  jobId: string;
  lockToken: string;
  job: T;
};

@Injectable()
export class ChatBackgroundQueueService {
  private static readonly ATTACHMENT_DUE_KEY =
    'chat:queue:attachment-preview:due:v1';
  private static readonly ATTACHMENT_PAYLOAD_KEY =
    'chat:queue:attachment-preview:payload:v1';
  private static readonly ATTACHMENT_LOCK_PREFIX =
    'chat:queue:attachment-preview:lock:v1:';
  private static readonly ATTACHMENT_DEAD_LETTER_KEY =
    'chat:queue:attachment-preview:dead-letter:v1';
  private static readonly ATTACHMENT_DEAD_LETTER_MAX_ITEMS = 200;

  private static readonly SCHEDULED_DUE_KEY =
    'chat:queue:scheduled-message:due:v1';
  private static readonly SCHEDULED_PAYLOAD_KEY =
    'chat:queue:scheduled-message:payload:v1';
  private static readonly SCHEDULED_LOCK_PREFIX =
    'chat:queue:scheduled-message:lock:v1:';
  private static readonly SCHEDULED_DEAD_LETTER_KEY =
    'chat:queue:scheduled-message:dead-letter:v1';
  private static readonly SCHEDULED_DEAD_LETTER_MAX_ITEMS = 200;

  private readonly logger = new Logger(ChatBackgroundQueueService.name);

  constructor(
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async enqueueAttachmentPreviewJob(
    job: ChatAttachmentPreviewQueueJob,
  ): Promise<void> {
    await this.enqueueJob({
      dueKey: ChatBackgroundQueueService.ATTACHMENT_DUE_KEY,
      payloadKey: ChatBackgroundQueueService.ATTACHMENT_PAYLOAD_KEY,
      jobId: job.attachmentId,
      runAfter: job.runAfter,
      payload: job,
    });
  }

  async claimDueAttachmentPreviewJobs(params: {
    limit: number;
    lockTtlMs: number;
  }): Promise<Array<ClaimedJob<ChatAttachmentPreviewQueueJob>>> {
    return this.claimDueJobs<ChatAttachmentPreviewQueueJob>({
      dueKey: ChatBackgroundQueueService.ATTACHMENT_DUE_KEY,
      payloadKey: ChatBackgroundQueueService.ATTACHMENT_PAYLOAD_KEY,
      lockPrefix: ChatBackgroundQueueService.ATTACHMENT_LOCK_PREFIX,
      limit: params.limit,
      lockTtlMs: params.lockTtlMs,
    });
  }

  async releaseAttachmentPreviewClaim(params: {
    attachmentId: string;
    lockToken: string;
  }): Promise<void> {
    await this.releaseClaimedJobLock({
      lockKey: `${ChatBackgroundQueueService.ATTACHMENT_LOCK_PREFIX}${params.attachmentId}`,
      lockToken: params.lockToken,
    });
  }

  async moveAttachmentPreviewToDeadLetter(params: {
    job: ChatAttachmentPreviewQueueJob;
    reason: string;
  }): Promise<void> {
    await this.pushDeadLetterItem({
      deadLetterKey: ChatBackgroundQueueService.ATTACHMENT_DEAD_LETTER_KEY,
      maxItems: ChatBackgroundQueueService.ATTACHMENT_DEAD_LETTER_MAX_ITEMS,
      payload: {
        ...params.job,
        reason: params.reason,
        failedAt: new Date().toISOString(),
      },
    });
  }

  async enqueueScheduledMessageJob(
    job: ChatScheduledMessageQueueJob,
  ): Promise<void> {
    await this.enqueueJob({
      dueKey: ChatBackgroundQueueService.SCHEDULED_DUE_KEY,
      payloadKey: ChatBackgroundQueueService.SCHEDULED_PAYLOAD_KEY,
      jobId: job.scheduledMessageId,
      runAfter: job.runAfter,
      payload: job,
    });
  }

  async removeScheduledMessageJob(scheduledMessageId: string): Promise<void> {
    await this.redis
      .multi()
      .zrem(ChatBackgroundQueueService.SCHEDULED_DUE_KEY, scheduledMessageId)
      .hdel(
        ChatBackgroundQueueService.SCHEDULED_PAYLOAD_KEY,
        scheduledMessageId,
      )
      .del(
        `${ChatBackgroundQueueService.SCHEDULED_LOCK_PREFIX}${scheduledMessageId}`,
      )
      .exec();
  }

  async claimDueScheduledMessageJobs(params: {
    limit: number;
    lockTtlMs: number;
  }): Promise<Array<ClaimedJob<ChatScheduledMessageQueueJob>>> {
    return this.claimDueJobs<ChatScheduledMessageQueueJob>({
      dueKey: ChatBackgroundQueueService.SCHEDULED_DUE_KEY,
      payloadKey: ChatBackgroundQueueService.SCHEDULED_PAYLOAD_KEY,
      lockPrefix: ChatBackgroundQueueService.SCHEDULED_LOCK_PREFIX,
      limit: params.limit,
      lockTtlMs: params.lockTtlMs,
    });
  }

  async releaseScheduledMessageClaim(params: {
    scheduledMessageId: string;
    lockToken: string;
  }): Promise<void> {
    await this.releaseClaimedJobLock({
      lockKey: `${ChatBackgroundQueueService.SCHEDULED_LOCK_PREFIX}${params.scheduledMessageId}`,
      lockToken: params.lockToken,
    });
  }

  async moveScheduledMessageToDeadLetter(params: {
    job: ChatScheduledMessageQueueJob;
    reason: string;
  }): Promise<void> {
    await this.pushDeadLetterItem({
      deadLetterKey: ChatBackgroundQueueService.SCHEDULED_DEAD_LETTER_KEY,
      maxItems: ChatBackgroundQueueService.SCHEDULED_DEAD_LETTER_MAX_ITEMS,
      payload: {
        ...params.job,
        reason: params.reason,
        failedAt: new Date().toISOString(),
      },
    });
  }

  async logQueueSnapshot(): Promise<void> {
    try {
      const [
        attachmentQueueSize,
        attachmentDeadLetterSize,
        scheduledQueueSize,
        scheduledDeadLetterSize,
      ] = await Promise.all([
        this.redis.zcard(ChatBackgroundQueueService.ATTACHMENT_DUE_KEY),
        this.redis.llen(ChatBackgroundQueueService.ATTACHMENT_DEAD_LETTER_KEY),
        this.redis.zcard(ChatBackgroundQueueService.SCHEDULED_DUE_KEY),
        this.redis.llen(ChatBackgroundQueueService.SCHEDULED_DEAD_LETTER_KEY),
      ]);
      this.logger.debug(
        `[chat-queue] attachmentQueued=${attachmentQueueSize} attachmentDeadLetter=${attachmentDeadLetterSize} scheduledQueued=${scheduledQueueSize} scheduledDeadLetter=${scheduledDeadLetterSize}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to load chat queue snapshot: ${(error as Error).message}`,
      );
    }
  }

  private async enqueueJob<T>(params: {
    dueKey: string;
    payloadKey: string;
    jobId: string;
    runAfter: number;
    payload: T;
  }): Promise<void> {
    await this.redis
      .multi()
      .hset(params.payloadKey, params.jobId, JSON.stringify(params.payload))
      .zadd(params.dueKey, params.runAfter, params.jobId)
      .exec();
  }

  private async claimDueJobs<T>(params: {
    dueKey: string;
    payloadKey: string;
    lockPrefix: string;
    limit: number;
    lockTtlMs: number;
  }): Promise<Array<ClaimedJob<T>>> {
    const now = Date.now();
    const scanLimit = Math.max(params.limit * 3, params.limit);
    const candidateJobIds = await this.redis.zrangebyscore(
      params.dueKey,
      '-inf',
      now,
      'LIMIT',
      0,
      scanLimit,
    );
    if (candidateJobIds.length === 0) {
      return [];
    }

    const claimed: Array<ClaimedJob<T>> = [];

    for (const jobId of candidateJobIds) {
      if (claimed.length >= params.limit) {
        break;
      }

      const lockKey = `${params.lockPrefix}${jobId}`;
      const lockToken = `${Date.now()}:${Math.random()}`;
      const lockOk = await this.redis.set(
        lockKey,
        lockToken,
        'PX',
        params.lockTtlMs,
        'NX',
      );
      if (lockOk !== 'OK') {
        continue;
      }

      const removedCount = await this.redis.zrem(params.dueKey, jobId);
      if (removedCount === 0) {
        await this.releaseClaimedJobLock({ lockKey, lockToken });
        continue;
      }

      const payload = await this.redis.hget(params.payloadKey, jobId);
      if (!payload) {
        await this.releaseClaimedJobLock({ lockKey, lockToken });
        continue;
      }
      await this.redis.hdel(params.payloadKey, jobId);

      try {
        claimed.push({
          jobId,
          lockToken,
          job: JSON.parse(payload) as T,
        });
      } catch {
        await this.redis.hdel(params.payloadKey, jobId);
        await this.releaseClaimedJobLock({ lockKey, lockToken });
      }
    }

    return claimed;
  }

  private async releaseClaimedJobLock(params: {
    lockKey: string;
    lockToken: string;
  }): Promise<void> {
    try {
      await this.redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        params.lockKey,
        params.lockToken,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to release chat queue job lock ${params.lockKey}: ${(error as Error).message}`,
      );
    }
  }

  private async pushDeadLetterItem(params: {
    deadLetterKey: string;
    maxItems: number;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.redis
      .multi()
      .lpush(params.deadLetterKey, JSON.stringify(params.payload))
      .ltrim(params.deadLetterKey, 0, params.maxItems - 1)
      .exec();
  }
}
