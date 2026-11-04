import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ChatMessageDraftSource {
  COMPOSER_AUTOSAVE = 'composer_autosave',
  CANCELLED_SCHEDULE = 'cancelled_schedule',
  MANUAL_SAVE = 'manual_save',
}

@Entity({ schema: 'chat', name: 'message_drafts' })
@Index(['organizationId', 'authorUserId', 'updatedAt'])
@Index(['organizationId', 'roomId', 'authorUserId', 'updatedAt'])
export class ChatMessageDraft {
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

  @Column({
    name: 'draft_source',
    type: 'enum',
    enum: ChatMessageDraftSource,
    enumName: 'chat_message_draft_source_enum',
    default: ChatMessageDraftSource.COMPOSER_AUTOSAVE,
  })
  draftSource: ChatMessageDraftSource;

  @Column({
    name: 'last_composer_activity_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastComposerActivityAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
