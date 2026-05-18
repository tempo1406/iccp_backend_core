import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'system', name: 'audit_logs' })
@Index('idx_system_audit_logs_org', ['organizationId'])
@Index('idx_system_audit_logs_user', ['userId'])
@Index('idx_system_audit_logs_entity_type', ['entityType'])
@Index('idx_system_audit_logs_action', ['action'])
@Index('idx_system_audit_logs_created_at', ['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100, nullable: true })
  entityType?: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId?: string | null;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues?: Record<string, unknown> | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues?: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
