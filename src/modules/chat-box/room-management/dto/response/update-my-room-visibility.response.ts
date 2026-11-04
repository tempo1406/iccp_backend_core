import { ChatHiddenReason } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMyRoomVisibilityResponse {
  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  roomId: string;

  @ApiProperty({ example: '447db699-827e-4cd9-9020-2438aa6882a9' })
  userId: string;

  @ApiProperty({ example: false })
  previousIsHidden: boolean;

  @ApiProperty({ example: true })
  currentIsHidden: boolean;

  @ApiPropertyOptional({
    enum: ChatHiddenReason,
    example: ChatHiddenReason.MUTE_AND_HIDE,
  })
  previousHiddenReason?: ChatHiddenReason;

  @ApiPropertyOptional({
    enum: ChatHiddenReason,
    example: ChatHiddenReason.MUTE_AND_HIDE,
  })
  currentHiddenReason?: ChatHiddenReason;

  @ApiPropertyOptional({ example: '2026-03-20T10:00:00.000Z' })
  previousHiddenAt?: Date;

  @ApiPropertyOptional({ example: '2026-03-20T10:00:00.000Z' })
  currentHiddenAt?: Date;

  @ApiProperty({
    example: false,
    description:
      'True neu co thay doi hidden state, false neu request khong lam thay doi du lieu',
  })
  updated: boolean;
}
