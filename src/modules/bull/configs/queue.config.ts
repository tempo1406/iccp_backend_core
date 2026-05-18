import { QUEUE_NAME, QUEUE_PREFIX } from '../constants/queue.constant';

export type BullConfig = {
  name: string;
  prefix: string;
};

export const registerQueueConfig: BullConfig[] = [
  // billing
  { name: QUEUE_NAME.BILLING_EXPIRED_SUBSCRIPTIONS, prefix: QUEUE_PREFIX.BILLING },
  { name: QUEUE_NAME.BILLING_RENEWAL_REMINDERS, prefix: QUEUE_PREFIX.BILLING },
  { name: QUEUE_NAME.BILLING_ORPHANED_PAYMENTS, prefix: QUEUE_PREFIX.BILLING },
  { name: QUEUE_NAME.BILLING_EXPIRED_TRIALS, prefix: QUEUE_PREFIX.BILLING },
  // analytics
  { name: QUEUE_NAME.KPI_DIGEST_DISPATCH, prefix: QUEUE_PREFIX.ANALYTICS },
  { name: QUEUE_NAME.PERIODIC_REPORT_DISPATCH, prefix: QUEUE_PREFIX.ANALYTICS },
  // daily-report
  { name: QUEUE_NAME.DAILY_REPORT_REMINDERS, prefix: QUEUE_PREFIX.DAILY_REPORT },
  // notification
  { name: QUEUE_NAME.CAMPAIGN_PROCESS, prefix: QUEUE_PREFIX.NOTIFICATION },
];

export const getDefaultQueueOptions = () => ({
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 86400,
    },
  },
});

export const buildQueueConfig = () =>
  registerQueueConfig.map((q) => ({
    name: q.name,
    prefix: q.prefix,
    ...getDefaultQueueOptions(),
  }));
