import { ChatNotifyLevel } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMyRoomNotifySettingsResponse {
  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  roomId: string;

  @ApiProperty({ example: '09ed8d65-be16-415b-861c-d26001529ca8' })
  userId: string;

  @ApiProperty({ enum: ChatNotifyLevel, example: ChatNotifyLevel.ALL })
  previousNotifyLevel: ChatNotifyLevel;

  @ApiProperty({ enum: ChatNotifyLevel, example: ChatNotifyLevel.MENTIONS })
  currentNotifyLevel: ChatNotifyLevel;

  @ApiPropertyOptional({
    example: '2026-03-16T00:00:00.000Z',
    nullable: true,
  })
  previousMuteUntil?: Date;

  @ApiPropertyOptional({
    example: '2026-03-16T00:00:00.000Z',
    nullable: true,
  })
  currentMuteUntil?: Date;

  @ApiProperty({
    description:
      'True nếu có thay đổi thực tế trên notify settings; false nếu request giống hệt trạng thái hiện tại.',
    example: true,
  })
  updated: boolean;
}
