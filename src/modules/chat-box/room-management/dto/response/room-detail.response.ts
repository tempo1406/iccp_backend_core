import { ApiProperty } from '@nestjs/swagger';
import { RoomMemberResponse } from './room-member.response';
import { RoomSummaryResponse } from './room-summary.response';

export class RoomDetailResponse extends RoomSummaryResponse {
  @ApiProperty({
    type: [RoomMemberResponse],
    description: 'Danh sách member đang hoạt động trong room',
  })
  members: RoomMemberResponse[];
}
