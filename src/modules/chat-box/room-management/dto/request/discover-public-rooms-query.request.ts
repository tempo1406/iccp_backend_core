import {
  ChatContextScope,
} from '@modules/chat-box/room-management/entities/room.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum DiscoverPublicRoomsSortBy {
  RECENT = 'recent',
  MEMBERS = 'members',
  NAME = 'name',
}

export class DiscoverPublicRoomsQueryRequest {
  @ApiPropertyOptional({
    enum: ChatContextScope,
    description:
      'Loc theo scope room. Phase hien tai chi ho tro organization | project.',
  })
  @IsOptional()
  @IsEnum(ChatContextScope)
  contextScope?: ChatContextScope;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Loc theo contextId. Neu truyen contextId thi phai gui kem contextScope.',
  })
  @IsOptional()
  @IsUUID()
  contextId?: string;

  @ApiPropertyOptional({
    example: 'product',
    description: 'Search theo channel name/topic/description/room key',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    example: '2026-03-30T08:30:00.000Z',
    description: 'Cursor theo updatedAt (ISO datetime)',
  })
  @IsOptional()
  @IsISO8601()
  cursor?: string;

  @ApiPropertyOptional({
    enum: DiscoverPublicRoomsSortBy,
    example: DiscoverPublicRoomsSortBy.RECENT,
    default: DiscoverPublicRoomsSortBy.RECENT,
  })
  @IsOptional()
  @IsEnum(DiscoverPublicRoomsSortBy)
  sortBy?: DiscoverPublicRoomsSortBy = DiscoverPublicRoomsSortBy.RECENT;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
