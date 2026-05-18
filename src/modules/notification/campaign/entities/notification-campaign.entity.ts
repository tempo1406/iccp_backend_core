import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CampaignStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum TargetType {
  SPECIFIC_USERS = 'SPECIFIC_USERS',
  ORG_ALL = 'ORG_ALL',
  ORG_ROLE = 'ORG_ROLE',
}

@Entity({ schema: 'system', name: 'notification_campaigns' })
export class NotificationCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 'info' })
  type: string;

  @Column({
    name: 'target_type',
    type: 'enum',
    enum: TargetType,
  })
  targetType: TargetType;

  @Column({ name: 'target_org_id', type: 'uuid', nullable: true })
  targetOrgId: string | null;

  @Column({
    name: 'target_role_ids',
    type: 'uuid',
    array: true,
    nullable: true,
  })
  targetRoleIds: string[] | null;

  @Column({
    name: 'target_user_ids',
    type: 'uuid',
    array: true,
    nullable: true,
  })
  targetUserIds: string[] | null;

  @Column({ name: 'send_email', default: false })
  sendEmail: boolean;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.PENDING,
  })
  status: CampaignStatus;

  @Column({ name: 'total_recipients', default: 0 })
  totalRecipients: number;

  @Column({ name: 'sent_count', default: 0 })
  sentCount: number;

  @Column({ name: 'failed_count', default: 0 })
  failedCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
