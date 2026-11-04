import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'rbac', name: 'roles' })
@Index('IDX_rbac_roles_org_project', ['organizationId', 'projectId'])
@Index('UQ_rbac_roles_org_name', ['organizationId', 'name'], {
  unique: true,
  where: `"project_id" IS NULL AND "organizationId" IS NOT NULL`,
})
@Index('UQ_rbac_roles_project_name', ['organizationId', 'projectId', 'name'], {
  unique: true,
  where: `"project_id" IS NOT NULL`,
})
@Index('UQ_rbac_roles_system_name', ['name'], {
  unique: true,
  where: `"organizationId" IS NULL AND "project_id" IS NULL`,
})
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string; // 'owner' | 'admin' | 'employee' | 'project_manager' | custom

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ default: false })
  isSystemRole: boolean; // true for global system roles

  @Column({ nullable: true, type: 'uuid' })
  organizationId?: string; // null for global system role

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId?: string; // set when role definition belongs to one project

  @Column({ name: 'created_by', nullable: true, type: 'uuid' })
  createdBy?: string; // user id of role creator

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
