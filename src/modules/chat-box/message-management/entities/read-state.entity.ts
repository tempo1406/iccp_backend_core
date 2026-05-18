import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'chat', name: 'read_states' })
@Unique(['roomId', 'userId'])
@Index(['organizationId', 'userId'])
@Index(['userId', 'updatedAt'])
export class ChatReadState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'last_read_message_id', type: 'uuid', nullable: true })
  lastReadMessageId?: string;

  @Column({ name: 'last_read_at', type: 'timestamp', nullable: true })
  lastReadAt?: Date;

  @Column({ name: 'unread_count_cache', type: 'int', default: 0 })
  unreadCountCache: number;

  @Column({
    name: 'is_manual_unread_by_user',
    type: 'boolean',
    default: false,
  })
  isManualUnreadByUser: boolean;

  @Column({
    name: 'manual_unread_at',
    type: 'timestamp',
    nullable: true,
  })
  manualUnreadAt?: Date;

  @Column({
    name: 'manual_unread_from_message_id',
    type: 'uuid',
    nullable: true,
  })
  manualUnreadFromMessageId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
