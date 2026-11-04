import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  PeriodicReportRunStatus,
  PERIODIC_REPORT_TYPE,
  ReportFrequency,
  DEFAULT_REPORT_FREQUENCY,
} from '../domain/constants/periodic-report.constant';
import {
  PeriodicReportArtifact,
  PeriodicReportRecipient,
  PeriodicReportSummarySnapshot,
} from '../domain/types/periodic-report.types';

@Entity({ schema: 'tenant', name: 'report_runs' })
@Index('idx_report_runs_type_status_schedule', ['reportType', 'status', 'scheduledFor'])
@Index('idx_report_runs_type_next_retry', ['reportType', 'nextRetryAt'])
@Index(
  'uq_report_runs_org_type_freq_period',
  ['organizationId', 'reportType', 'frequency', 'periodKey'],
  { unique: true },
)
export class ReportRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({
    name: 'report_type',
    type: 'varchar',
    length: 50,
    default: PERIODIC_REPORT_TYPE,
  })
  reportType: string;

  @Column({
    name: 'frequency',
    type: 'varchar',
    length: 20,
    default: DEFAULT_REPORT_FREQUENCY,
  })
  frequency: ReportFrequency;

  @Column({ name: 'period_key', type: 'varchar', length: 20 })
  periodKey: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 30,
    default: PeriodicReportRunStatus.PENDING,
  })
  status: PeriodicReportRunStatus;

  @Column({ name: 'scheduled_for', type: 'timestamptz' })
  scheduledFor: Date;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'success_count', type: 'int', default: 0 })
  successCount: number;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
  nextRetryAt?: Date | null;

  @Column({ name: 'last_attempt_at', type: 'timestamptz', nullable: true })
  lastAttemptAt?: Date | null;

  @Column({ name: 'summary_snapshot', type: 'jsonb', nullable: true })
  summarySnapshot?: PeriodicReportSummarySnapshot | null;

  @Column({ name: 'artifact_snapshot', type: 'jsonb', nullable: true })
  artifactSnapshot?: PeriodicReportArtifact[] | null;

  @Column({ name: 'resolved_recipient_snapshot', type: 'jsonb', nullable: true })
  resolvedRecipientSnapshot?: PeriodicReportRecipient[] | null;

  @Column({ name: 'successful_recipient_snapshot', type: 'jsonb', nullable: true })
  successfulRecipientSnapshot?: PeriodicReportRecipient[] | null;

  @Column({ name: 'pending_recipient_snapshot', type: 'jsonb', nullable: true })
  pendingRecipientSnapshot?: PeriodicReportRecipient[] | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
