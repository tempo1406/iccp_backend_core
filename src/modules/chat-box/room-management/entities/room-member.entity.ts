import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum ChatMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

export enum ChatJoinSource {
  MANUAL = 'manual',
  INVITE = 'invite',
  AUTO = 'auto',
  IMPORT = 'import',
}

export enum ChatNotifyLevel {
  ALL = 'all',
  MENTIONS = 'mentions',
  MUTE = 'mute',
}

export enum ChatHiddenReason {
  MUTE_AND_HIDE = 'mute_and_hide',
  MANUAL_HIDE = 'manual_hide',
}

@Entity({ schema: 'chat', name: 'room_members' })
@Unique(['roomId', 'userId'])
@Index(['organizationId', 'userId', 'isActive'])
@Index(['organizationId', 'userId', 'isStarred', 'isActive'])
@Index(['organizationId', 'userId', 'isHidden', 'isActive'])
@Index(['roomId', 'memberRole'])
export class ChatRoomMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'member_role',
    type: 'enum',
    enum: ChatMemberRole,
    enumName: 'chat_member_role_enum',
    default: ChatMemberRole.MEMBER,
  })
  memberRole: ChatMemberRole;

  @Column({
    name: 'join_source',
    type: 'enum',
    enum: ChatJoinSource,
    enumName: 'chat_join_source_enum',
    default: ChatJoinSource.MANUAL,
  })
  joinSource: ChatJoinSource;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'left_at', type: 'timestamp', nullable: true })
  leftAt?: Date;

  @Column({
    name: 'notify_level',
    type: 'enum',
    enum: ChatNotifyLevel,
    enumName: 'chat_notify_level_enum',
    default: ChatNotifyLevel.ALL,
  })
  notifyLevel: ChatNotifyLevel;

  @Column({ name: 'mute_until', type: 'timestamp', nullable: true })
  muteUntil?: Date;

  @Column({ name: 'is_hidden', type: 'boolean', default: false })
  isHidden: boolean;

  @Column({
    name: 'hidden_reason',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  hiddenReason?: ChatHiddenReason;

  @Column({ name: 'hidden_at', type: 'timestamp', nullable: true })
  hiddenAt?: Date;

  @Column({ name: 'is_starred', type: 'boolean', default: false })
  isStarred: boolean;

  @Column({ name: 'starred_at', type: 'timestamp', nullable: true })
  starredAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
