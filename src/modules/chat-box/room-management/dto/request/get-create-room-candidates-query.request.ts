import {
  ChatContextScope,
  ChatRoomType,
} from '@modules/chat-box/room-management/entities/room.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';

export class GetCreateRoomCandidatesQueryRequest {
  @ApiPropertyOptional({
    enum: ChatRoomType,
    default: ChatRoomType.GROUP_DM,
    description:
      'Loai room tao moi can lay candidate. Hien tai API nay toi uu cho group_dm.',
  })
  @IsOptional()
  @IsEnum(ChatRoomType)
  roomType?: ChatRoomType = ChatRoomType.GROUP_DM;

  @ApiPropertyOptional({
    enum: ChatContextScope,
    default: ChatContextScope.ORGANIZATION,
    description: 'Pham vi scope cua room can tao: organization | project',
  })
  @IsOptional()
  @IsEnum(ChatContextScope)
  contextScope?: ChatContextScope = ChatContextScope.ORGANIZATION;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'contextId bat buoc khi contextScope=project (projectId can tao room).',
  })
  @IsOptional()
  @IsUUID()
  contextId?: string;

  @ApiPropertyOptional({
    example: 'alice',
    description: 'Search theo display name hoac email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
