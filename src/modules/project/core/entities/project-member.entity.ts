import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'project', name: 'project_members' })
@Unique(['projectId', 'userId'])
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  roleId?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Hours/day allocated to this project — only PM/Org Admin can set.
   *  NULL = no specific allocation → fallback to org_working_time_configs when computing KPI.
   *  Valid range: 0.5 .. 24.0
   */
  @Column({ name: 'allocated_hours_per_day', type: 'decimal', precision: 4, scale: 2, nullable: true })
  allocatedHoursPerDay?: number;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy?: string;
}
