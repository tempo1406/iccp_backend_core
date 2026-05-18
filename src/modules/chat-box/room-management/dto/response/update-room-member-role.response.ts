import { ChatMemberRole } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ApiProperty } from '@nestjs/swagger';
import { RoomDetailResponse } from './room-detail.response';

export class UpdateRoomMemberRoleResponse {
  @ApiProperty({ example: '86756fd6-1a2e-41d0-a0bf-9a59708e1185' })
  memberId: string;

  @ApiProperty({ enum: ChatMemberRole, example: ChatMemberRole.MEMBER })
  previousRole: ChatMemberRole;

  @ApiProperty({ enum: ChatMemberRole, example: ChatMemberRole.ADMIN })
  currentRole: ChatMemberRole;

  @ApiProperty({
    example: true,
    description:
      'Giá trị true khi role thực sự được thay đổi trong request này',
  })
  updated: boolean;

  @ApiProperty({ type: RoomDetailResponse })
  room: RoomDetailResponse;
}
