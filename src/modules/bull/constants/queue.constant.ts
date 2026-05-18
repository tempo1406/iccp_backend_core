export const QUEUE_NAME = {
  // billing
  BILLING_EXPIRED_SUBSCRIPTIONS: 'billing-expired-subscriptions',
  BILLING_RENEWAL_REMINDERS: 'billing-renewal-reminders',
  BILLING_ORPHANED_PAYMENTS: 'billing-orphaned-payments',
  BILLING_EXPIRED_TRIALS: 'billing-expired-trials',
  // analytics
  KPI_DIGEST_DISPATCH: 'kpi-digest-dispatch',
  PERIODIC_REPORT_DISPATCH: 'periodic-report-dispatch',
  // daily-report
  DAILY_REPORT_REMINDERS: 'daily-report-reminders',
  // notification
  CAMPAIGN_PROCESS: 'campaign-process',
} as const;

export const QUEUE_PREFIX = {
  BILLING: '{billing}',
  ANALYTICS: '{analytics}',
  DAILY_REPORT: '{daily-report}',
  NOTIFICATION: '{notification}',
} as const;

export const QUEUE_PATTERN = {
  EVERY_HOUR: '0 0 * * * *',
  EVERY_MINUTE: '* * * * *',
  EVERY_15_MIN: '0 */15 * * * *',
  EVERY_DAY_8AM: '0 0 8 * * *',
} as const;

export type QueueName = (typeof QUEUE_NAME)[keyof typeof QUEUE_NAME];
