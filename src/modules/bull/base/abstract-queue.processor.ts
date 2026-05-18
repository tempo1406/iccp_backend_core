import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { bullmqJobsTotal, bullmqJobDuration } from '@modules/metrics/metrics.interceptor';

export abstract class AbstractQueueProcessor<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> extends WorkerHost {
  protected abstract readonly logger: Logger;

  /**
   * Entry point từ BullMQ. Subclass KHÔNG override method này —
   * override `handle()` để implement business logic.
   */
  async process(job: Job<TData>): Promise<TResult> {
    const attempt = (job.attemptsMade ?? 0) + 1;
    const queue = job.queueName;
    const start = Date.now();

    this.logger.log(
      `[START] name=${job.name} id=${job.id} attempt=${attempt}`,
    );

    try {
      const result = await this.handle(job);
      const duration = (Date.now() - start) / 1000;
      bullmqJobsTotal.inc({ queue, status: 'completed' });
      bullmqJobDuration.observe({ queue }, duration);
      this.logger.log(`[DONE] name=${job.name} id=${job.id}`);
      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      bullmqJobsTotal.inc({ queue, status: 'failed' });
      bullmqJobDuration.observe({ queue }, duration);
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[FAIL] name=${job.name} id=${job.id} attempt=${attempt} error=${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Re-throw để BullMQ mark job failed và trigger retry policy
      throw error;
    }
  }

  protected abstract handle(job: Job<TData>): Promise<TResult>;
}
