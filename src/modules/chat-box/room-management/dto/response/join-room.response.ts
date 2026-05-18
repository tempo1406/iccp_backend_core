import { ApiProperty } from '@nestjs/swagger';
import { RoomDetailResponse } from './room-detail.response';

export class JoinRoomResponse {
  @ApiProperty({
    description:
      'Giá trị true nếu user vừa join hoặc được kích hoạt lại ở request hiện tại',
    example: true,
  })
  joined: boolean;

  @ApiProperty({
    type: RoomDetailResponse,
    description: 'Thông tin room sau khi join',
  })
  room: RoomDetailResponse;
}
