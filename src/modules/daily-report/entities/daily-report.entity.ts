import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DailyReportStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  LOCKED = 'locked',
}

@Entity({ schema: 'project', name: 'daily_reports' })
@Index(
  'uq_daily_reports_org_project_user_date',
  ['organizationId', 'projectId', 'userId', 'reportDate'],
  {
    unique: true,
  },
)
@Index('idx_daily_reports_org_project_date', [
  'organizationId',
  'projectId',
  'reportDate',
])
export class DailyReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // Keep this nullable at entity level because this codebase still runs with
  // synchronize=true in some environments. The migration backfills legacy rows
  // before project-scoped reports become fully populated.
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'report_date', type: 'date' })
  reportDate: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: DailyReportStatus.DRAFT,
  })
  status: DailyReportStatus;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ type: 'text', nullable: true })
  blockers?: string | null;

  @Column({ name: 'plan_tomorrow', type: 'text', nullable: true })
  planTomorrow?: string | null;

  @Column({ name: 'total_logged_minutes', type: 'int', default: 0 })
  totalLoggedMinutes: number;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @Column({ name: 'seen_by', type: 'uuid', nullable: true })
  seenBy?: string | null;

  @Column({ name: 'seen_at', type: 'timestamptz', nullable: true })
  seenAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
