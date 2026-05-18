import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum DailyReportItemType {
  WORKLOG = 'worklog',
  MANUAL = 'manual',
}

@Entity({ schema: 'project', name: 'daily_report_items' })
@Index('idx_daily_report_items_report', ['dailyReportId', 'displayOrder'])
export class DailyReportItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'daily_report_id', type: 'uuid' })
  dailyReportId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: DailyReportItemType.WORKLOG,
  })
  type: DailyReportItemType;

  @Column({ name: 'worklog_id', type: 'uuid', nullable: true })
  worklogId?: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string | null;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId?: string | null;

  @Column({
    name: 'project_name_snapshot',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  projectNameSnapshot?: string | null;

  @Column({
    name: 'task_title_snapshot',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  taskTitleSnapshot?: string | null;

  @Column({
    name: 'task_slug_snapshot',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  taskSlugSnapshot?: string | null;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  @Column({ name: 'work_date', type: 'date' })
  workDate: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date | null;

  @Column({ name: 'duration_minutes', type: 'int', default: 0 })
  durationMinutes: number;

  @Column({ name: 'progress_percent', type: 'int', nullable: true })
  progressPercent?: number | null;

  @Column({ name: 'is_blocker', type: 'boolean', default: false })
  isBlocker: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
