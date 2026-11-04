import { ChatRoomInvitationStatus } from '@modules/chat-box/room-management/entities/room-invitation.entity';
import { ChatMemberRole } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomInvitationResponse {
  @ApiProperty({ example: 'e8f8cdf5-3222-44cf-a09a-df0c8ab2fe04' })
  id: string;

  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  roomId: string;

  @ApiProperty({ example: 'ebf11c0a-f8ac-4ddf-ad81-9e7c98ea1cd5' })
  organizationId: string;

  @ApiProperty({ example: '8eb14979-fdf1-48fb-8eb8-8cf2015dc8de' })
  invitedUserId: string;

  @ApiProperty({ example: '6e882f55-74d2-4f5f-b1df-7862908bd465' })
  invitedBy: string;

  @ApiProperty({ enum: ChatRoomInvitationStatus })
  status: ChatRoomInvitationStatus;

  @ApiProperty({
    enum: ChatMemberRole,
    example: ChatMemberRole.MEMBER,
    description: 'Role se ap dung cho user khi chap nhan loi moi',
  })
  memberRole: ChatMemberRole;

  @ApiPropertyOptional({ example: 'Welcome to private room' })
  inviteMessage?: string;

  @ApiPropertyOptional({ example: '2026-03-11T05:00:00.000Z' })
  acceptedAt?: Date;

  @ApiProperty({ example: '2026-03-11T04:00:00.000Z' })
  createdAt: Date;
}
