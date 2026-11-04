import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum ChatMessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  FILE = 'file',
  IMAGE = 'image',
  EVENT = 'event',
}

@Entity({ schema: 'chat', name: 'messages' })
@Unique(['roomId', 'senderId', 'clientMessageId'])
@Index(['roomId', 'sentAt'])
@Index(['threadRootMessageId', 'sentAt'])
@Index(['organizationId', 'sentAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({ name: 'sender_id', type: 'uuid', nullable: true })
  senderId?: string;

  @Column({
    name: 'message_type',
    type: 'enum',
    enum: ChatMessageType,
    enumName: 'chat_message_type_enum',
    default: ChatMessageType.TEXT,
  })
  messageType: ChatMessageType;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ name: 'rich_content', type: 'jsonb', nullable: true })
  richContent?: Record<string, any>;

  @Column({ name: 'thread_root_message_id', type: 'uuid', nullable: true })
  threadRootMessageId?: string;

  @Column({ name: 'parent_message_id', type: 'uuid', nullable: true })
  parentMessageId?: string;

  @Column({
    name: 'client_message_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  clientMessageId?: string;

  @Column({ name: 'reply_count', type: 'int', default: 0 })
  replyCount: number;

  @Column({ name: 'reaction_count', type: 'int', default: 0 })
  reactionCount: number;

  @Column({ name: 'is_edited', type: 'boolean', default: false })
  isEdited: boolean;

  @Column({ name: 'edited_at', type: 'timestamp', nullable: true })
  editedAt?: Date;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({
    name: 'sent_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  sentAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
