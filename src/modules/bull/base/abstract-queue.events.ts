import { OnQueueEvent, QueueEventsHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

export abstract class AbstractQueueEvents extends QueueEventsHost {
  protected abstract readonly logger: Logger;

  @OnQueueEvent('added')
  onAdded(job: { jobId: string; name: string }) {
    this.logger.log(`[added] jobId=${job.jobId} name=${job.name}`);
  }

  @OnQueueEvent('waiting')
  onWaiting(job: { jobId: string }) {
    this.logger.log(`[waiting] jobId=${job.jobId}`);
  }

  @OnQueueEvent('active')
  onActive(job: { jobId: string }) {
    this.logger.log(`[active] jobId=${job.jobId}`);
  }

  @OnQueueEvent('completed')
  onCompleted(job: { jobId: string; returnvalue: unknown }) {
    this.logger.log(`[completed] jobId=${job.jobId}`);
  }

  @OnQueueEvent('failed')
  onFailed(job: { jobId: string; failedReason: string }) {
    this.logger.error(
      `[failed] jobId=${job.jobId} reason=${job.failedReason}`,
    );
  }

  @OnQueueEvent('delayed')
  onDelayed(job: { jobId: string; delay: number }) {
    this.logger.log(`[delayed] jobId=${job.jobId} delay=${job.delay}ms`);
  }

  @OnQueueEvent('removed')
  onRemoved(job: { jobId: string }) {
    this.logger.log(`[removed] jobId=${job.jobId}`);
  }
}
