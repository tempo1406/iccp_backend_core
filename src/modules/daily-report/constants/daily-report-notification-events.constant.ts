export const DAILY_REPORT_NOTIFICATION_EVENTS = {
  SUBMITTED: 'daily_report.notification.submitted',
  COMMENTED: 'daily_report.notification.commented',
  SEEN: 'daily_report.notification.seen',
} as const;

export const DAILY_REPORT_NOTIFICATION_TYPES = {
  SUBMITTED: 'daily_report_submitted',
  REMINDER: 'daily_report_reminder',
  COMMENTED: 'daily_report_commented',
  SEEN: 'daily_report_seen',
} as const;

interface DailyReportNotificationBaseEvent {
  organizationId: string;
  projectId: string;
  actorUserId: string;
  occurredAt: string;
}

export interface DailyReportSubmittedNotificationEvent extends DailyReportNotificationBaseEvent {
  reportId: string;
  reportDate: string;
}

export interface DailyReportCommentedNotificationEvent extends DailyReportNotificationBaseEvent {
  reportId: string;
  reportDate: string;
  commentId: string;
}

export interface DailyReportSeenNotificationEvent extends DailyReportNotificationBaseEvent {
  reportId: string;
  reportDate: string;
}
