import { Expose } from 'class-transformer';

export class ProjectSettingsResponse {
  @Expose() projectId: string;
  @Expose() organizationId: string;

  // Daily Report Reminder
  @Expose() dailyEnabled: boolean;
  @Expose() dailyTime?: string;
  @Expose() dailyDays: number[];

  // Reminder
  @Expose() taskDueReminderEnabled: boolean;
  @Expose() taskDueReminderHours: number[];
  @Expose() reminderChannels: string[];
  @Expose() overdueEscalationEnabled: boolean;
  @Expose() overdueEscalationAfterHours: number;

  // Point Scale
  @Expose() pointScaleType?: string;
  @Expose() pointScaleValues?: number[];
  @Expose() maxPointPerTask?: number;

  // KPI Weights (resolved — merged with org defaults)
  @Expose() kpiWeightPointCompletion: number;
  @Expose() kpiWeightOnTime: number;
  @Expose() kpiWeightOtContribution: number;

  // Bonus
  @Expose() bonusEnabled: boolean;
  @Expose() bonusOnTimeTask: number;
  @Expose() bonusEarlyTaskHours: number;
  @Expose() bonusEarlyTask: number;
  @Expose() bonusZeroOverdue: number;
  @Expose() bonusMaxCap: number;
  @Expose() bonusOtPerEffectiveHour: number;

  @Expose() orgTimezone: string;
  @Expose() updatedAt: Date;
}
