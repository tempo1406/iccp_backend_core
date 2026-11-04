import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'tenant', name: 'kpi_target_snapshots' })
@Index('uq_kpi_target_snapshots_target_id', ['targetId'], { unique: true })
export class KpiTargetSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({
    name: 'actual_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  actualScore?: number | null;

  @Column({
    name: 'actual_on_time_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  actualOnTimeRate?: number | null;

  @Column({
    name: 'actual_point_completion_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  actualPointCompletionRate?: number | null;

  @Column({
    name: 'actual_ot_hours',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  actualOtHours?: number | null;

  @Column({ name: 'actual_completed_tasks', type: 'int', nullable: true })
  actualCompletedTasks?: number | null;

  @Column({ name: 'actual_overdue_tasks', type: 'int', nullable: true })
  actualOverdueTasks?: number | null;

  @Column({ name: 'actual_payload', type: 'jsonb', nullable: true })
  actualPayload?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'archived_at' })
  archivedAt: Date;
}
