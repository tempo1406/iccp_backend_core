import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomDetailResponse } from './room-detail.response';

export class UpdateRoomInfoResponse {
  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  roomId: string;

  @ApiPropertyOptional({ example: 'marketing-private', nullable: true })
  previousName?: string;

  @ApiPropertyOptional({ example: 'marketing-private-v2', nullable: true })
  currentName?: string;

  @ApiPropertyOptional({
    example: 'Kenh thao luan noi bo team marketing',
    nullable: true,
  })
  previousTopic?: string;

  @ApiPropertyOptional({
    example: 'Kenh trao doi va chia se tai lieu marketing',
    nullable: true,
  })
  currentTopic?: string;

  @ApiPropertyOptional({
    example: 'Noi thao luan noi bo team marketing',
    nullable: true,
  })
  previousDescription?: string;

  @ApiPropertyOptional({
    example: 'Noi thao luan va cap nhat cong viec marketing',
    nullable: true,
  })
  currentDescription?: string;

  @ApiProperty({
    example: true,
    description:
      'True neu room info duoc thay doi, false neu request giong het',
  })
  updated: boolean;

  @ApiProperty({ type: RoomDetailResponse })
  room: RoomDetailResponse;
}
