import { ChatRoomInvitationStatus } from '@modules/chat-box/room-management/entities/room-invitation.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomDetailResponse } from './room-detail.response';

export class AcceptInvitationResponse {
  @ApiProperty({ example: 'e8f8cdf5-3222-44cf-a09a-df0c8ab2fe04' })
  invitationId: string;

  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  roomId: string;

  @ApiProperty({
    enum: ChatRoomInvitationStatus,
    example: ChatRoomInvitationStatus.ACCEPTED,
  })
  invitationStatus: ChatRoomInvitationStatus;

  @ApiPropertyOptional({
    example: '2026-03-19T09:20:00.000Z',
    nullable: true,
  })
  acceptedAt?: Date;

  @ApiProperty({
    example: false,
    description:
      'True neu invitation da duoc accept tu truoc va request hien tai chi tra ve trang thai hien co',
  })
  alreadyAccepted: boolean;

  @ApiPropertyOptional({
    type: RoomDetailResponse,
    description:
      'Thong tin room neu user van la active member. Co the vang khi user khong con quyen truy cap room',
  })
  room?: RoomDetailResponse;
}
