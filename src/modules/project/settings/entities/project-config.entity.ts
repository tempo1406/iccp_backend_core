import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'project', name: 'project_configs' })
export class ProjectConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid', unique: true })
  projectId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // --- Meeting: Daily Standup ---
  @Column({ name: 'daily_enabled', type: 'boolean', default: false })
  dailyEnabled: boolean;

  @Column({ name: 'daily_time', type: 'varchar', length: 5, nullable: true })
  dailyTime?: string;

  @Column({
    name: 'daily_days',
    type: 'int',
    array: true,
    default: [1, 2, 3, 4, 5],
  })
  dailyDays: number[];

  // --- Reminder: Task Deadline ---
  @Column({ name: 'task_due_reminder_enabled', type: 'boolean', default: true })
  taskDueReminderEnabled: boolean;

  @Column({
    name: 'task_due_reminder_hours',
    type: 'int',
    array: true,
    default: [24, 2],
  })
  taskDueReminderHours: number[];

  @Column({
    name: 'reminder_channels',
    type: 'text',
    array: true,
    default: ['push_notification', 'in_app'],
  })
  reminderChannels: string[];

  @Column({
    name: 'overdue_escalation_enabled',
    type: 'boolean',
    default: false,
  })
  overdueEscalationEnabled: boolean;

  @Column({ name: 'overdue_escalation_after_hours', type: 'int', default: 4 })
  overdueEscalationAfterHours: number;

  // --- Point Scale ---
  @Column({
    name: 'point_scale_type',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  pointScaleType?: 'fibonacci' | 'linear' | 'custom';

  @Column({
    name: 'point_scale_values',
    type: 'int',
    array: true,
    nullable: true,
  })
  pointScaleValues?: number[];

  @Column({ name: 'max_point_per_task', type: 'int', nullable: true })
  maxPointPerTask?: number;

  // --- KPI Weights (null = inherit org) ---
  @Column({
    name: 'kpi_weight_point_completion',
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  kpiWeightPointCompletion?: number;

  @Column({
    name: 'kpi_weight_on_time',
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  kpiWeightOnTime?: number;

  @Column({
    name: 'kpi_weight_ot_contribution',
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  kpiWeightOtContribution?: number;

  // --- Bonus Rules (null = inherit org) ---
  @Column({ name: 'bonus_enabled', type: 'boolean', nullable: true })
  bonusEnabled?: boolean;

  @Column({
    name: 'bonus_on_time_task',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  bonusOnTimeTask?: number;

  @Column({ name: 'bonus_early_task_hours', type: 'int', nullable: true })
  bonusEarlyTaskHours?: number;

  @Column({
    name: 'bonus_early_task',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  bonusEarlyTask?: number;

  @Column({
    name: 'bonus_zero_overdue',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  bonusZeroOverdue?: number;

  @Column({
    name: 'bonus_max_cap',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  bonusMaxCap?: number;

  @Column({
    name: 'bonus_ot_per_effective_hour',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  bonusOtPerEffectiveHour?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
