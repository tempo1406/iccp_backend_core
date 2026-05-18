import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity({ schema: 'project', name: 'tasks' })
@Index('IDX_project_tasks_slug', ['slug'], { unique: true })
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ name: 'slug', type: 'varchar', length: 80, nullable: true })
  slug?: string;

  @Column({ name: 'parent_task_id', type: 'uuid', nullable: true })
  parentTaskId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'status_id', type: 'uuid', nullable: true })
  statusId?: string;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo?: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate?: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  /** Estimated story points — only PM/Org Admin can set, other members read-only */
  @Column({ name: 'estimated_point', type: 'int', nullable: true })
  estimatedPoint?: number;

  /** Estimated hours — only PM/Org Admin can set */
  @Column({ name: 'estimated_hours', type: 'decimal', precision: 6, scale: 2, nullable: true })
  estimatedHours?: number;

  @Column({ name: 'actual_logged_minutes', type: 'int', default: 0 })
  actualLoggedMinutes: number;

  @Column({ name: 'actual_start', type: 'timestamp', nullable: true })
  actualStart?: Date;

  @Column({ name: 'actual_end', type: 'timestamp', nullable: true })
  actualEnd?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy?: string;
}
