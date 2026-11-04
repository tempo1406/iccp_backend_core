import { Expose } from 'class-transformer';
import { PeriodicReportSchedule } from '../../constants/periodic-report-settings.constant';

export class OrgSettingsResponse {
  @Expose() organizationId: string;
  @Expose() aiTokenLimit: number;

  // KPI Weights
  @Expose() defaultWeightPointCompletion: number;
  @Expose() defaultWeightOnTime: number;
  @Expose() defaultWeightOtContribution: number;

  // OT Multipliers
  @Expose() otMultiplierWeekday: number;
  @Expose() otMultiplierSaturday: number;
  @Expose() otMultiplierSunday: number;
  @Expose() otMultiplierHoliday: number;

  // Bonus
  @Expose() bonusEnabled: boolean;
  @Expose() bonusOnTimeTask: number;
  @Expose() bonusEarlyTaskHours: number;
  @Expose() bonusEarlyTask: number;
  @Expose() bonusZeroOverdue: number;
  @Expose() bonusMaxCap: number;
  @Expose() bonusOtPerEffectiveHour: number;

  // Notification
  @Expose() defaultReminderChannels: string[];

  // Digest
  @Expose() digestEnabled: boolean;
  @Expose() digestDay: number;
  @Expose() digestTime: string;
  @Expose() digestRecipients: string[];
  @Expose() digestChannels: string[];
  @Expose() lastDigestSentAt: Date | null;

  @Expose() periodicReportSchedules: PeriodicReportSchedule[];

  @Expose() updatedAt: Date;
}