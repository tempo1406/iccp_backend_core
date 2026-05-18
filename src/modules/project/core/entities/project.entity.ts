import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ProjectBudgetCurrency {
  USD = 'USD',
  VND = 'VND',
}

@Entity({ schema: 'project', name: 'projects' })
@Index('IDX_project_projects_slug', ['slug'])
@Index('UQ_project_projects_org_slug', ['organizationId', 'slug'], {
  unique: true,
  where: `"deleted_at" IS NULL`,
})
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: ProjectPriority,
    default: ProjectPriority.MEDIUM,
  })
  priority: ProjectPriority;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: Date;

  @Column({ name: 'manager_id', type: 'uuid', array: true, nullable: true })
  managerId?: string[] | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'estimated_budget', type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedBudget?: number;

  @Column({ name: 'actual_budget', type: 'decimal', precision: 15, scale: 2, nullable: true })
  actualBudget?: number;

  @Column({
    name: 'budget_currency',
    type: 'enum',
    enum: ProjectBudgetCurrency,
    default: ProjectBudgetCurrency.VND,
  })
  budgetCurrency: ProjectBudgetCurrency;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy?: string;
}
