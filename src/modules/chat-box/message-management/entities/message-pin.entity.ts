import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ schema: 'chat', name: 'message_pins' })
@Unique(['roomId', 'messageId'])
@Index(['roomId', 'isActive', 'pinnedAt'])
export class ChatMessagePin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @Column({ name: 'pinned_by', type: 'uuid' })
  pinnedBy: string;

  @CreateDateColumn({ name: 'pinned_at' })
  pinnedAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'unpinned_at', type: 'timestamp', nullable: true })
  unpinnedAt?: Date;
}
