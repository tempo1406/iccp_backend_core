import { ChatHiddenReason } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateMyRoomVisibilityRequest {
  @ApiProperty({
    example: true,
    description: 'True de hide room khoi sidebar chinh, false de unhide',
  })
  @IsBoolean()
  isHidden: boolean;

  @ApiPropertyOptional({
    enum: ChatHiddenReason,
    example: ChatHiddenReason.MUTE_AND_HIDE,
    description: 'Ly do hide room',
  })
  @IsOptional()
  @IsEnum(ChatHiddenReason)
  hiddenReason?: ChatHiddenReason;

  @ApiPropertyOptional({
    example: 'room_menu',
    description: 'Nguon hanh dong tu UI (de theo doi telemetry)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;
}
