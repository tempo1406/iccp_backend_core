import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum ChatMentionType {
  USER = 'user',
  CHANNEL = 'channel',
  GROUP = 'group',
  HERE = 'here',
}

@Entity({ schema: 'chat', name: 'message_mentions' })
@Unique(['messageId', 'mentionedUserId', 'mentionType'])
@Index(['mentionedUserId', 'isRead', 'createdAt'])
@Index(['organizationId', 'mentionedUserId'])
export class ChatMessageMention {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @Column({ name: 'mentioned_user_id', type: 'uuid' })
  mentionedUserId: string;

  @Column({
    name: 'mention_type',
    type: 'enum',
    enum: ChatMentionType,
    enumName: 'chat_mention_type_enum',
    default: ChatMentionType.USER,
  })
  mentionType: ChatMentionType;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
