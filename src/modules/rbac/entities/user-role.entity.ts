import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum ScopeType {
  ORGANIZATION = 'organization',
  PROJECT = 'project',
}

@Entity({ schema: 'rbac', name: 'user_roles' })
@Unique(['userId', 'organizationId', 'roleId', 'scopeType', 'scopeId'])
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({
    name: 'scope_type',
    type: 'enum',
    enum: ScopeType,
    default: ScopeType.ORGANIZATION,
  })
  scopeType: ScopeType; // organization | project

  @Column({ name: 'scope_id', nullable: true, type: 'uuid' })
  scopeId?: string; // project_id nếu scopeType = 'project'

  @Column({ name: 'assigned_by', nullable: true, type: 'uuid' })
  assignedBy?: string; // user_id của người assign

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
