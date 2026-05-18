export enum PeriodicReportRecipientGroup {
  OWNER = 'project_owner',
  ORG_ADMIN = 'org_admin',
  PROJECT_MANAGER = 'project_manager',
  CONTACT_EMAIL = 'contact_email',
}

export enum PeriodicReportScope {
  ORG_SUMMARY = 'org_summary',
  PROJECT_SUMMARY = 'project_summary',
  MEMBER_KPI = 'member_kpi',
  WORKBOOK = 'workbook',
}

export enum PeriodicReportChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
}

export const DEFAULT_PERIODIC_REPORT_RECIPIENT_GROUPS = [
  PeriodicReportRecipientGroup.OWNER,
  PeriodicReportRecipientGroup.ORG_ADMIN,
];

export const DEFAULT_PERIODIC_REPORT_SCOPES = [
  PeriodicReportScope.ORG_SUMMARY,
  PeriodicReportScope.PROJECT_SUMMARY,
  PeriodicReportScope.MEMBER_KPI,
  PeriodicReportScope.WORKBOOK,
];

export const DEFAULT_PERIODIC_REPORT_CHANNELS = [
  PeriodicReportChannel.EMAIL,
];

export interface PeriodicReportSchedule {
  frequency: 'monthly' | 'quarterly' | 'yearly';
  enabled: boolean;
  sendDelayDays: number;
  sendTime: string;
  recipientGroups: string[];
  customEmails: string[];
  channels: string[];
  scopes: string[];
}

export const DEFAULT_PERIODIC_REPORT_SCHEDULES: PeriodicReportSchedule[] = [
  {
    frequency: 'quarterly',
    enabled: false,
    sendDelayDays: 1,
    sendTime: '08:00',
    recipientGroups: DEFAULT_PERIODIC_REPORT_RECIPIENT_GROUPS,
    customEmails: [],
    channels: DEFAULT_PERIODIC_REPORT_CHANNELS,
    scopes: DEFAULT_PERIODIC_REPORT_SCOPES,
  },
];
