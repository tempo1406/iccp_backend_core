import { ChatPresenceStatus } from '@modules/chat-box/presence/entities/user-presence.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMyPresenceRequest {
  @ApiProperty({
    enum: ChatPresenceStatus,
    description: 'Trạng thái hiện tại của user',
    example: ChatPresenceStatus.ONLINE,
  })
  @IsEnum(ChatPresenceStatus)
  presenceStatus: ChatPresenceStatus;

  @ApiPropertyOptional({
    example: 'Đang họp',
    description: 'Nội dung trạng thái tùy chỉnh',
  })
  @IsOptional()
  @IsString()
  customStatus?: string;

  @ApiPropertyOptional({
    example: ':spiral_calendar_pad:',
    description: 'Emoji tùy chỉnh',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  customEmoji?: string;

  @ApiPropertyOptional({
    example: 'web',
    description: 'Nguồn cập nhật presence',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;
}
