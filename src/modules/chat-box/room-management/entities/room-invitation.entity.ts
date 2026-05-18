import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatMemberRole } from './room-member.entity';

export enum ChatRoomInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  REVOKED = 'revoked',
}

@Entity({ schema: 'chat', name: 'room_invitations' })
@Index(['roomId', 'status'])
@Index(['organizationId', 'invitedUserId', 'status'])
export class ChatRoomInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ name: 'invited_user_id', type: 'uuid' })
  invitedUserId: string;

  @Column({ name: 'invited_by', type: 'uuid' })
  invitedBy: string;

  @Column({ name: 'invite_message', type: 'text', nullable: true })
  inviteMessage?: string;

  @Column({
    name: 'member_role',
    type: 'enum',
    enum: ChatMemberRole,
    enumName: 'chat_member_role_enum',
    default: ChatMemberRole.MEMBER,
  })
  memberRole: ChatMemberRole;

  @Column({
    type: 'enum',
    enum: ChatRoomInvitationStatus,
    enumName: 'chat_room_invitation_status_enum',
    default: ChatRoomInvitationStatus.PENDING,
  })
  status: ChatRoomInvitationStatus;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
