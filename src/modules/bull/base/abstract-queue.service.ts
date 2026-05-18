import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, JobsOptions, Queue } from 'bullmq';
import {
  ICronQueueConfig,
  IQueueService,
} from './interfaces/queue-job.interface';
import { DEFAULT_TIMEZONE } from '@common/constants/timezone.constant';

export abstract class AbstractQueueService<
    TData extends Record<string, unknown> = Record<string, unknown>,
  >
  implements OnModuleInit, IQueueService<TData>
{
  protected abstract readonly logger: Logger;
  protected abstract readonly queue: Queue<TData>;

  /**
   * Override trong subclass để enable cron repeatable job.
   * Return `null` nếu queue là event-driven (không có cron).
   */
  protected getCronConfig(): ICronQueueConfig | null {
    return null;
  }

  async onModuleInit(): Promise<void> {
    const config = this.getCronConfig();
    if (config) {
      await this.setupRepeatableJob(config);
    }
  }

  protected async setupRepeatableJob(
    config: ICronQueueConfig,
  ): Promise<void> {
    try {
      const existing = await this.queue.getRepeatableJobs();
      await Promise.all(
        existing.map((job) => this.queue.removeRepeatableByKey(job.key)),
      );

      await this.queue.add(
        config.jobName as never,
        {} as never,
        {
          repeat: {
            pattern: config.cronPattern,
            tz: config.timezone ?? DEFAULT_TIMEZONE,
          },
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );

      this.logger.log(
        `Repeatable job scheduled: ${config.jobName} [${config.cronPattern}] tz=${config.timezone ?? DEFAULT_TIMEZONE}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to setup repeatable job ${config.jobName}: ${String(error)}`,
      );
      throw error;
    }
  }

  async enqueue(data: TData, opts?: JobsOptions): Promise<Job<TData>> {
    return this.queue.add(`${this.queue.name}-manual` as never, data as never, {
      removeOnComplete: true,
      removeOnFail: false,
      ...opts,
    });
  }

  async triggerManual(data?: TData): Promise<Job<TData>> {
    return this.enqueue((data ?? {}) as TData);
  }
}
