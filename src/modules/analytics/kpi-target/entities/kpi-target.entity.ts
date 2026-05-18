import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  KpiTargetPeriod,
  KpiTargetScopeType,
  KpiTargetStatus,
} from '../enums/kpi-target.enum';

@Entity({ schema: 'tenant', name: 'kpi_targets' })
@Index('idx_kpi_targets_org_scope', ['organizationId', 'scopeType'])
@Index('idx_kpi_targets_org_user', ['organizationId', 'userId'])
@Index('idx_kpi_targets_org_role', ['organizationId', 'roleId'])
@Index('idx_kpi_targets_project', ['projectId'])
@Index('idx_kpi_targets_period', ['periodStart', 'periodEnd'])
export class KpiTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string | null;

  @Column({
    name: 'scope_type',
    type: 'varchar',
    length: 20,
    default: KpiTargetScopeType.USER,
  })
  scopeType: KpiTargetScopeType;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  roleId?: string | null;

  @Column({
    name: 'period',
    type: 'varchar',
    length: 20,
    default: KpiTargetPeriod.MONTHLY,
  })
  period: KpiTargetPeriod;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: Date;

  // ---- Target metrics (all nullable: null = not tracked) ----
  @Column({
    name: 'target_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  targetScore?: number;

  @Column({
    name: 'target_point_completion_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  targetPointCompletionRate?: number;

  @Column({
    name: 'target_on_time_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  targetOnTimeRate?: number;

  @Column({
    name: 'target_ot_hours',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  targetOtHours?: number;

  @Column({ name: 'target_completed_tasks', type: 'int', nullable: true })
  targetCompletedTasks?: number;

  @Column({ name: 'max_overdue_tasks', type: 'int', nullable: true })
  maxOverdueTasks?: number;

  @Column({ name: 'require_zero_overdue', type: 'boolean', default: false })
  requireZeroOverdue: boolean;

  // ---- Metadata ----
  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: KpiTargetStatus.ACTIVE,
  })
  status: KpiTargetStatus;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy?: string | null;
}
