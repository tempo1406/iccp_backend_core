import { ChatRoomVisibility } from '@modules/chat-box/room-management/entities/room.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export class UpdateRoomVisibilityRequest {
  @ApiProperty({
    enum: ChatRoomVisibility,
    example: ChatRoomVisibility.PRIVATE,
    description: 'Visibility moi cua channel',
  })
  @IsEnum(ChatRoomVisibility)
  visibility: ChatRoomVisibility;

  @ApiPropertyOptional({
    example: '2026-03-30T08:30:00.000Z',
    description: 'Optimistic concurrency token theo room.updatedAt',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}

