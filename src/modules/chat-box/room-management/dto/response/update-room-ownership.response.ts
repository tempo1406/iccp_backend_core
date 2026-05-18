import { ApiProperty } from '@nestjs/swagger';
import { RoomDetailResponse } from './room-detail.response';

export class UpdateRoomOwnershipResponse {
  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  roomId: string;

  @ApiProperty({ example: '6e882f55-74d2-4f5f-b1df-7862908bd465' })
  previousOwnerUserId: string;

  @ApiProperty({ example: '8eb14979-fdf1-48fb-8eb8-8cf2015dc8de' })
  currentOwnerUserId: string;

  @ApiProperty({
    example: true,
    description: 'True neu ownership duoc thay doi, false neu owner khong doi',
  })
  updated: boolean;

  @ApiProperty({ type: RoomDetailResponse })
  room: RoomDetailResponse;
}

