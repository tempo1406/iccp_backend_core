import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomDetailResponse } from './room-detail.response';

export class RemoveRoomMemberResponse {
  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  roomId: string;

  @ApiProperty({ example: '8eb14979-fdf1-48fb-8eb8-8cf2015dc8de' })
  memberId: string;

  @ApiProperty({ example: false })
  removedBySelf: boolean;

  @ApiPropertyOptional({ example: '6e882f55-74d2-4f5f-b1df-7862908bd465' })
  previousOwnerUserId?: string;

  @ApiPropertyOptional({ example: '8eb14979-fdf1-48fb-8eb8-8cf2015dc8de' })
  currentOwnerUserId?: string;

  @ApiPropertyOptional({
    example: '8eb14979-fdf1-48fb-8eb8-8cf2015dc8de',
    description: 'Owner moi neu co owner transfer trong request nay',
  })
  transferredOwnerUserId?: string;

  @ApiPropertyOptional({
    type: RoomDetailResponse,
    description:
      'Snapshot room sau mutation neu caller van con quyen truy cap room',
  })
  room?: RoomDetailResponse;
}

