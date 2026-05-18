import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProjectInviteRole {
  PM = 'pm',
  MEMBER = 'member',
}

export enum ProjectInviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELED = 'canceled',
}

@Entity({ schema: 'project', name: 'project_invites' })
export class ProjectInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'invitee_user_id', type: 'uuid' })
  inviteeUserId: string;

  @Column({ name: 'inviter_user_id', type: 'uuid' })
  inviterUserId: string;

  @Column({
    type: 'enum',
    enum: ProjectInviteRole,
    default: ProjectInviteRole.PM,
  })
  role: ProjectInviteRole;

  @Column({
    type: 'enum',
    enum: ProjectInviteStatus,
    default: ProjectInviteStatus.PENDING,
  })
  status: ProjectInviteStatus;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  token?: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy?: string;
}
