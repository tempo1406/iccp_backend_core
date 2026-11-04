import Redis from 'ioredis';
import {
  ChatAttachmentPreviewQueueJob,
  ChatBackgroundQueueService,
} from './chat-background-queue.service';

type MultiMock = {
  hset: jest.Mock;
  zadd: jest.Mock;
  zrem: jest.Mock;
  hdel: jest.Mock;
  del: jest.Mock;
  lpush: jest.Mock;
  ltrim: jest.Mock;
  exec: jest.Mock;
};

type RedisMock = {
  multi: jest.Mock<MultiMock, []>;
  zrangebyscore: jest.Mock<Promise<string[]>, any[]>;
  set: jest.Mock<Promise<string | null>, any[]>;
  zrem: jest.Mock<Promise<number>, any[]>;
  hget: jest.Mock<Promise<string | null>, any[]>;
  hdel: jest.Mock<Promise<number>, any[]>;
  eval: jest.Mock<Promise<number>, any[]>;
  zcard: jest.Mock<Promise<number>, any[]>;
  llen: jest.Mock<Promise<number>, any[]>;
};

function createMultiMock(): MultiMock {
  const chain: MultiMock = {
    hset: jest.fn(),
    zadd: jest.fn(),
    zrem: jest.fn(),
    hdel: jest.fn(),
    del: jest.fn(),
    lpush: jest.fn(),
    ltrim: jest.fn(),
    exec: jest.fn().mockResolvedValue([]),
  };
  chain.hset.mockReturnValue(chain);
  chain.zadd.mockReturnValue(chain);
  chain.zrem.mockReturnValue(chain);
  chain.hdel.mockReturnValue(chain);
  chain.del.mockReturnValue(chain);
  chain.lpush.mockReturnValue(chain);
  chain.ltrim.mockReturnValue(chain);
  return chain;
}

function createRedisMock(): {
  redis: RedisMock;
  getLastMulti: () => MultiMock | undefined;
} {
  let lastMulti: MultiMock | undefined;
  const redis: RedisMock = {
    multi: jest.fn(() => {
      lastMulti = createMultiMock();
      return lastMulti;
    }),
    zrangebyscore: jest.fn().mockResolvedValue([]),
    set: jest.fn().mockResolvedValue(null),
    zrem: jest.fn().mockResolvedValue(0),
    hget: jest.fn().mockResolvedValue(null),
    hdel: jest.fn().mockResolvedValue(0),
    eval: jest.fn().mockResolvedValue(0),
    zcard: jest.fn().mockResolvedValue(0),
    llen: jest.fn().mockResolvedValue(0),
  };
  return {
    redis,
    getLastMulti: () => lastMulti,
  };
}

describe('ChatBackgroundQueueService', () => {
  it('claims a due attachment preview job with distributed lock', async () => {
    const { redis } = createRedisMock();
    const service = new ChatBackgroundQueueService(redis as unknown as Redis);
    const payload: ChatAttachmentPreviewQueueJob = {
      organizationId: 'org-1',
      roomId: 'room-1',
      messageId: 'msg-1',
      attachmentId: 'att-1',
      actorUserId: 'user-1',
      attempt: 0,
      runAfter: Date.now(),
    };

    redis.zrangebyscore.mockResolvedValue(['att-1']);
    redis.set.mockResolvedValue('OK');
    redis.zrem.mockResolvedValue(1);
    redis.hget.mockResolvedValue(JSON.stringify(payload));

    const claimed = await service.claimDueAttachmentPreviewJobs({
      limit: 1,
      lockTtlMs: 30_000,
    });

    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.jobId).toBe('att-1');
    expect(claimed[0]?.job.attachmentId).toBe('att-1');
    expect(redis.set).toHaveBeenCalledWith(
      'chat:queue:attachment-preview:lock:v1:att-1',
      expect.any(String),
      'PX',
      30_000,
      'NX',
    );
    expect(redis.hdel).toHaveBeenCalledWith(
      'chat:queue:attachment-preview:payload:v1',
      'att-1',
    );
  });

  it('releases lock and skips job when payload is missing after claim', async () => {
    const { redis } = createRedisMock();
    const service = new ChatBackgroundQueueService(redis as unknown as Redis);

    redis.zrangebyscore.mockResolvedValue(['att-1']);
    redis.set.mockResolvedValue('OK');
    redis.zrem.mockResolvedValue(1);
    redis.hget.mockResolvedValue(null);
    redis.eval.mockResolvedValue(1);

    const claimed = await service.claimDueAttachmentPreviewJobs({
      limit: 1,
      lockTtlMs: 30_000,
    });

    expect(claimed).toHaveLength(0);
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'chat:queue:attachment-preview:lock:v1:att-1',
      expect.any(String),
    );
  });

  it('pushes attachment preview failures into dead-letter queue', async () => {
    const { redis, getLastMulti } = createRedisMock();
    const service = new ChatBackgroundQueueService(redis as unknown as Redis);

    await service.moveAttachmentPreviewToDeadLetter({
      job: {
        organizationId: 'org-1',
        roomId: 'room-1',
        messageId: 'msg-1',
        attachmentId: 'att-1',
        actorUserId: 'user-1',
        attempt: 3,
        runAfter: Date.now(),
      },
      reason: 'preview_failed',
    });

    const multi = getLastMulti();
    expect(multi).toBeDefined();
    expect(multi?.lpush).toHaveBeenCalledWith(
      'chat:queue:attachment-preview:dead-letter:v1',
      expect.any(String),
    );
    expect(multi?.ltrim).toHaveBeenCalledWith(
      'chat:queue:attachment-preview:dead-letter:v1',
      0,
      199,
    );
    expect(multi?.exec).toHaveBeenCalledTimes(1);
  });
});
