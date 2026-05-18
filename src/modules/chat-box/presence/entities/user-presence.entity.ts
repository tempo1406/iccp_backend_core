import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum ChatPresenceStatus {
  ONLINE = 'online',
  AWAY = 'away',
  DND = 'dnd',
  OFFLINE = 'offline',
}

@Entity({ schema: 'chat', name: 'user_presence' })
@Unique(['organizationId', 'userId'])
@Index(['organizationId', 'presenceStatus'])
@Index(['lastActivityAt'])
export class ChatUserPresence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'presence_status',
    type: 'enum',
    enum: ChatPresenceStatus,
    enumName: 'chat_presence_status_enum',
    default: ChatPresenceStatus.OFFLINE,
  })
  presenceStatus: ChatPresenceStatus;

  @Column({ name: 'custom_status', type: 'text', nullable: true })
  customStatus?: string;

  @Column({ name: 'custom_emoji', type: 'varchar', length: 32, nullable: true })
  customEmoji?: string;

  @Column({ name: 'last_seen_at', type: 'timestamp', nullable: true })
  lastSeenAt?: Date;

  @Column({ name: 'last_activity_at', type: 'timestamp', nullable: true })
  lastActivityAt?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
