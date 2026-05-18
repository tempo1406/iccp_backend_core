import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ schema: 'chat', name: 'message_reactions' })
@Unique(['messageId', 'userId', 'emoji'])
@Index(['messageId'])
@Index(['userId', 'createdAt'])
export class ChatMessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 32 })
  emoji: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
