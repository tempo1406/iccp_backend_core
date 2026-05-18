import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum ChatRoomType {
  CHANNEL = 'channel',
  DM = 'dm',
  GROUP_DM = 'group_dm',
}

export enum ChatRoomVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum ChatContextScope {
  ORGANIZATION = 'organization',
  PROJECT = 'project',
  DEPARTMENT = 'department',
}

@Entity({ schema: 'chat', name: 'rooms' })
@Unique(['organizationId', 'roomKey'])
@Index(['organizationId', 'roomType', 'isArchived'])
@Index(['organizationId', 'contextScope', 'contextId'])
@Index(['organizationId', 'lastMessageAt'])
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({
    name: 'room_type',
    type: 'enum',
    enum: ChatRoomType,
    enumName: 'chat_room_type_enum',
    default: ChatRoomType.CHANNEL,
  })
  roomType: ChatRoomType;

  @Column({
    type: 'enum',
    enum: ChatRoomVisibility,
    enumName: 'chat_room_visibility_enum',
    default: ChatRoomVisibility.PUBLIC,
  })
  visibility: ChatRoomVisibility;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({ name: 'room_key', type: 'varchar', length: 255, nullable: true })
  roomKey?: string;

  @Column({ type: 'text', nullable: true })
  topic?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'context_scope',
    type: 'enum',
    enum: ChatContextScope,
    enumName: 'chat_context_scope_enum',
    default: ChatContextScope.ORGANIZATION,
  })
  contextScope: ChatContextScope;

  @Column({ name: 'context_id', type: 'uuid', nullable: true })
  contextId?: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId?: string;

  @Column({ name: 'last_message_id', type: 'uuid', nullable: true })
  lastMessageId?: string;

  @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt?: Date;

  @Column({ name: 'archived_by_user_id', type: 'uuid', nullable: true })
  archivedByUserId?: string;

  @Column({
    name: 'allow_member_pin_messages',
    type: 'boolean',
    default: false,
  })
  allowMemberPinMessages: boolean;

  @Column({
    name: 'allow_guest_pin_messages',
    type: 'boolean',
    default: false,
  })
  allowGuestPinMessages: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
