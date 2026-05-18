import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaskWorklogSource {
  MANUAL = 'manual',
  TIMER = 'timer',
  DAILY_REPORT = 'daily_report',
}

@Entity({ schema: 'project', name: 'task_worklogs' })
@Index('idx_task_worklogs_task_work_date', ['taskId', 'workDate'])
@Index('idx_task_worklogs_org_user_work_date', ['organizationId', 'userId', 'workDate'])
export class TaskWorklog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'work_date', type: 'date' })
  workDate: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date | null;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'progress_percent', type: 'int', nullable: true })
  progressPercent?: number | null;

  @Column({ name: 'is_blocker', type: 'boolean', default: false })
  isBlocker: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: TaskWorklogSource.MANUAL,
  })
  source: TaskWorklogSource;

  @Column({ name: 'reported_daily_report_id', type: 'uuid', nullable: true })
  reportedDailyReportId?: string | null;

  @Column({ name: 'is_submitted', type: 'boolean', default: false })
  isSubmitted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
