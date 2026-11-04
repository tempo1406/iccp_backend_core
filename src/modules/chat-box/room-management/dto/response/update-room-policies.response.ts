import { ApiProperty } from '@nestjs/swagger';
import { RoomDetailResponse } from './room-detail.response';

export class UpdateRoomPoliciesResponse {
  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  roomId: string;

  @ApiProperty({ example: false })
  previousAllowMemberPinMessages: boolean;

  @ApiProperty({ example: true })
  currentAllowMemberPinMessages: boolean;

  @ApiProperty({ example: false })
  previousAllowGuestPinMessages: boolean;

  @ApiProperty({ example: false })
  currentAllowGuestPinMessages: boolean;

  @ApiProperty({
    example: true,
    description:
      'Giá trị true khi có ít nhất một giá trị policy được thay đổi trong request này',
  })
  updated: boolean;

  @ApiProperty({ type: RoomDetailResponse })
  room: RoomDetailResponse;
}
