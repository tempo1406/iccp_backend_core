export const PERIODIC_REPORT_TYPE = 'periodic';

export enum ReportFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export const DEFAULT_REPORT_FREQUENCY = ReportFrequency.QUARTERLY;

export enum PeriodicReportRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SENT = 'sent',
  PARTIAL_FAILED = 'partial_failed',
  FAILED_RETRYABLE = 'failed_retryable',
  FAILED_EXHAUSTED = 'failed_exhausted',
}

export enum PeriodicReportAttemptStatus {
  SUCCESS = 'success',
  PARTIAL_FAILED = 'partial_failed',
  FAILED = 'failed',
}

export enum PeriodicReportTriggerSource {
  AUTO = 'auto',
  RETRY = 'retry',
  MANUAL = 'manual',
}

export const PERIODIC_REPORT_RETRY_MINUTES = [15, 60, 360];

export const PERIODIC_REPORT_HISTORY_SORT_FIELDS = [
  'createdAt',
  'scheduledFor',
  'sentAt',
  'updatedAt',
];
