import { ChatContextScope } from '@modules/chat-box/room-management/entities/room.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SearchGlobalSuggestQueryRequest {
  @ApiProperty({
    example: 'khang',
    description: 'Search keyword for global chat suggest. Minimum 2 characters.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  q: string;

  @ApiPropertyOptional({
    description: 'Maximum items per section in suggest response.',
    default: 5,
    minimum: 1,
    maximum: 8,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  limitPerSection?: number = 5;

  @ApiPropertyOptional({
    enum: ChatContextScope,
    description:
      'Optional scope filter. Supported values: organization | project.',
  })
  @IsOptional()
  @IsEnum(ChatContextScope)
  contextScope?: ChatContextScope;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Optional scope id. Required when contextScope=project and forbidden for organization scope.',
  })
  @IsOptional()
  @IsUUID()
  contextId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional active room id used to boost ranking for current context.',
  })
  @IsOptional()
  @IsUUID()
  currentRoomId?: string;
}
