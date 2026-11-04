import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ChatScheduledMessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  CANCELLED = 'cancelled',
  CONVERTED_TO_DRAFT = 'converted_to_draft',
  FAILED = 'failed',
}

@Entity({ schema: 'chat', name: 'scheduled_messages' })
@Index(['status', 'scheduledForUtc'])
@Index(['authorUserId', 'status', 'scheduledForUtc'])
@Index(['roomId', 'status', 'scheduledForUtc'])
export class ChatScheduledMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({ name: 'author_user_id', type: 'uuid' })
  authorUserId: string;

  @Column({ name: 'thread_root_message_id', type: 'uuid', nullable: true })
  threadRootMessageId?: string;

  @Column({ name: 'parent_message_id', type: 'uuid', nullable: true })
  parentMessageId?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ name: 'rich_content', type: 'jsonb', nullable: true })
  richContent?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'scheduled_for_utc', type: 'timestamp' })
  scheduledForUtc: Date;

  @Column({ name: 'scheduled_timezone', type: 'varchar', length: 100 })
  scheduledTimezone: string;

  @Column({ name: 'scheduled_local_date', type: 'varchar', length: 20 })
  scheduledLocalDate: string;

  @Column({ name: 'scheduled_local_time', type: 'varchar', length: 20 })
  scheduledLocalTime: string;

  @Column({
    type: 'enum',
    enum: ChatScheduledMessageStatus,
    enumName: 'chat_scheduled_message_status_enum',
    default: ChatScheduledMessageStatus.PENDING,
  })
  status: ChatScheduledMessageStatus;

  @Column({ name: 'source_draft_id', type: 'uuid', nullable: true })
  sourceDraftId?: string;

  @Column({ name: 'sent_message_id', type: 'uuid', nullable: true })
  sentMessageId?: string;

  @Column({ name: 'last_error_code', type: 'varchar', length: 120, nullable: true })
  lastErrorCode?: string;

  @Column({ name: 'last_error_message', type: 'text', nullable: true })
  lastErrorMessage?: string;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
