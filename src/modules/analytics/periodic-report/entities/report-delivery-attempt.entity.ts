import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  PeriodicReportAttemptStatus,
  PeriodicReportTriggerSource,
} from '../domain/constants/periodic-report.constant';
import { PeriodicReportRecipient } from '../domain/types/periodic-report.types';

@Entity({ schema: 'tenant', name: 'report_delivery_attempts' })
@Index('idx_report_delivery_attempts_run', ['reportRunId', 'attemptNo'], {
  unique: true,
})
export class ReportDeliveryAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_run_id', type: 'uuid' })
  reportRunId: string;

  @Column({ name: 'attempt_no', type: 'int' })
  attemptNo: number;

  @Column({ name: 'trigger_source', type: 'varchar', length: 20 })
  triggerSource: PeriodicReportTriggerSource;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status: PeriodicReportAttemptStatus;

  @Column({ name: 'recipient_snapshot', type: 'jsonb', nullable: true })
  recipientSnapshot?: PeriodicReportRecipient[] | null;

  @Column({ name: 'successful_recipient_snapshot', type: 'jsonb', nullable: true })
  successfulRecipientSnapshot?: PeriodicReportRecipient[] | null;

  @Column({ name: 'failed_recipient_snapshot', type: 'jsonb', nullable: true })
  failedRecipientSnapshot?: PeriodicReportRecipient[] | null;

  @Column({ name: 'success_count', type: 'int', default: 0 })
  successCount: number;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({ name: 'error_summary', type: 'text', nullable: true })
  errorSummary?: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
