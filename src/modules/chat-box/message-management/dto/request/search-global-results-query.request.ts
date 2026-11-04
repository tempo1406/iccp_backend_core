import {
  ChatGlobalSearchSort,
  ChatGlobalSearchTab,
} from '@modules/chat-box/message-management/constants/search-global.constant';
import {
  ChatContextScope,
  ChatRoomType,
} from '@modules/chat-box/room-management/entities/room.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
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

const toBoolean = (value: unknown): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class SearchGlobalResultsQueryRequest {
  @ApiProperty({
    example: 'deploy',
    description: 'Search keyword for global chat results.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q: string;

  @ApiPropertyOptional({
    enum: ChatGlobalSearchTab,
    default: ChatGlobalSearchTab.ALL,
  })
  @IsOptional()
  @IsEnum(ChatGlobalSearchTab)
  tab?: ChatGlobalSearchTab = ChatGlobalSearchTab.ALL;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 50,
    description: 'Page size for the selected tab.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    description:
      'Cursor returned by previous call. For messages/files it is a base64url keyset cursor.',
    example: 'eyJzZW50QXQiOiIyMDI2LTA0LTA3VDA4OjE1OjAwLjAwMFoiLCJpZCI6Im1fMSJ9',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;

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
    description: 'Optional room filter for this conversation scope.',
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({
    enum: ChatRoomType,
    description: 'Optional room type filter for rooms/messages/files tabs.',
  })
  @IsOptional()
  @IsEnum(ChatRoomType)
  roomType?: ChatRoomType;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional sender/uploader filter for messages/files tabs.',
  })
  @IsOptional()
  @IsUUID()
  fromUserId?: string;

  @ApiPropertyOptional({
    description: 'Optional attachment filter for messages tab.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  hasAttachments?: boolean;

  @ApiPropertyOptional({
    example: 'pdf',
    description:
      'Optional file type filter (extension or documentType) for files tab.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  fileType?: string;

  @ApiPropertyOptional({
    example: '2026-04-01T00:00:00.000Z',
    description: 'Optional date range start (inclusive).',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-04-07T23:59:59.999Z',
    description: 'Optional date range end (inclusive).',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    enum: ChatGlobalSearchSort,
    default: ChatGlobalSearchSort.BEST_MATCH,
  })
  @IsOptional()
  @IsEnum(ChatGlobalSearchSort)
  sort?: ChatGlobalSearchSort = ChatGlobalSearchSort.BEST_MATCH;
}
