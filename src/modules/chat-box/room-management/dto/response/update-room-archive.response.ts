import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomDetailResponse } from './room-detail.response';

export class UpdateRoomArchiveResponse {
  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  roomId: string;

  @ApiProperty({ example: '447db699-827e-4cd9-9020-2438aa6882a9' })
  actorUserId: string;

  @ApiProperty({ example: false })
  previousIsArchived: boolean;

  @ApiProperty({ example: true })
  currentIsArchived: boolean;

  @ApiPropertyOptional({ example: '2026-03-20T08:00:00.000Z' })
  archivedAt?: Date;

  @ApiPropertyOptional({ example: '447db699-827e-4cd9-9020-2438aa6882a9' })
  archivedByUserId?: string;

  @ApiPropertyOptional({ example: 'Bo Bui' })
  archivedByDisplayName?: string;

  @ApiProperty({
    example: false,
    description:
      'True neu co thay doi archive state, false neu request khong lam thay doi du lieu',
  })
  updated: boolean;

  @ApiProperty({ type: RoomDetailResponse })
  room: RoomDetailResponse;
}
