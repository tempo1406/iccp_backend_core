import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  DEFAULT_PERIODIC_REPORT_SCHEDULES,
  PeriodicReportSchedule,
} from '../constants/periodic-report-settings.constant';

@Entity({ schema: 'tenant', name: 'org_settings' })
export class OrgSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', unique: true })
  organizationId: string;

  // --- KPI Weights ---
  @Column({
    name: 'default_weight_point_completion',
    type: 'decimal',
    precision: 4,
    scale: 3,
    default: 0.5,
  })
  defaultWeightPointCompletion: number;

  @Column({
    name: 'default_weight_on_time',
    type: 'decimal',
    precision: 4,
    scale: 3,
    default: 0.3,
  })
  defaultWeightOnTime: number;

  @Column({
    name: 'default_weight_ot_contribution',
    type: 'decimal',
    precision: 4,
    scale: 3,
    default: 0.2,
  })
  defaultWeightOtContribution: number;

  // --- OT Multipliers ---
  @Column({
    name: 'ot_multiplier_weekday',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 1.0,
  })
  otMultiplierWeekday: number;

  @Column({
    name: 'ot_multiplier_saturday',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 1.5,
  })
  otMultiplierSaturday: number;

  @Column({
    name: 'ot_multiplier_sunday',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 2.0,
  })
  otMultiplierSunday: number;

  @Column({
    name: 'ot_multiplier_holiday',
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: 3.0,
  })
  otMultiplierHoliday: number;

  // --- Default Bonus Rules ---
  @Column({ name: 'bonus_enabled', type: 'boolean', default: false })
  bonusEnabled: boolean;

  @Column({
    name: 'bonus_on_time_task',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0.5,
  })
  bonusOnTimeTask: number;

  @Column({ name: 'bonus_early_task_hours', type: 'int', default: 24 })
  bonusEarlyTaskHours: number;

  @Column({
    name: 'bonus_early_task',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.0,
  })
  bonusEarlyTask: number;

  @Column({
    name: 'bonus_zero_overdue',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 2.0,
  })
  bonusZeroOverdue: number;

  @Column({
    name: 'bonus_max_cap',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 10.0,
  })
  bonusMaxCap: number;

  @Column({
    name: 'bonus_ot_per_effective_hour',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0.2,
  })
  bonusOtPerEffectiveHour: number;

  // --- Notification Defaults ---
  @Column({
    name: 'default_reminder_channels',
    type: 'text',
    array: true,
    default: ['push_notification', 'in_app'],
  })
  defaultReminderChannels: string[];

  // --- KPI Digest ---
  @Column({ name: 'digest_enabled', type: 'boolean', default: false })
  digestEnabled: boolean;

  @Column({ name: 'digest_day', type: 'int', default: 1 })
  digestDay: number;

  @Column({ name: 'digest_time', type: 'varchar', length: 5, default: '08:00' })
  digestTime: string;

  @Column({
    name: 'digest_recipients',
    type: 'text',
    array: true,
    default: ['org_admin'],
  })
  digestRecipients: string[];

  @Column({
    name: 'digest_channels',
    type: 'text',
    array: true,
    default: ['email', 'in_app'],
  })
  digestChannels: string[];

  @Column({ name: 'last_digest_sent_at', type: 'timestamptz', nullable: true })
  lastDigestSentAt?: Date | null;

  // --- Periodic Report (multi-frequency) ---
  @Column({
    name: 'periodic_report_schedules',
    type: 'jsonb',
    default: () => `'${JSON.stringify(DEFAULT_PERIODIC_REPORT_SCHEDULES)}'::jsonb`,
  })
  periodicReportSchedules: PeriodicReportSchedule[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
