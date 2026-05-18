import { Job, JobsOptions } from 'bullmq';

export interface ICronQueueConfig {
  jobName: string;
  cronPattern: string;
  timezone?: string;
}

export interface IQueueService<TData = Record<string, unknown>> {
  enqueue(data: TData, opts?: JobsOptions): Promise<Job<TData>>;
  triggerManual(data?: TData): Promise<Job<TData>>;
}
