import {
  PaginationRequest,
  SortOrder,
} from '@common/dto/pagination.request';
import {
  ChatContextScope,
  ChatRoomType,
  ChatRoomVisibility,
} from '@modules/chat-box/room-management/entities/room.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

const toBoolean = (value: unknown): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value as boolean;
};

export class ListRoomsQueryRequest extends PaginationRequest {
  @ApiPropertyOptional({
    example: 'lastMessageAt',
    description:
      'Sort field for room list. If omitted, backend defaults to recent activity (lastMessageAt fallback updatedAt).',
  })
  @IsOptional()
  @IsString()
  override sortBy: string | undefined = undefined;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    description: 'Sort order. If omitted, defaults to DESC.',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  override sortOrder: SortOrder | undefined = undefined;

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
    example: 'marketing',
    description: 'Tim theo ten room hoac room_key',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ChatRoomType,
    description: 'Loc theo loai room',
  })
  @IsOptional()
  @IsEnum(ChatRoomType)
  roomType?: ChatRoomType;

  @ApiPropertyOptional({
    enum: ChatRoomVisibility,
    description: 'Loc theo visibility',
  })
  @IsOptional()
  @IsEnum(ChatRoomVisibility)
  visibility?: ChatRoomVisibility;

  @ApiPropertyOptional({
    example: false,
    description:
      'false (mac dinh): chi lay room chua archive; true: lay ca room da archive va chua archive.',
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeArchived?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'true: chi lay room da archived; false/bo qua: giu hanh vi includeArchived',
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  archivedOnly?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'true: chi lay room da star cua toi; false/bo qua: lay tat ca room toi dang tham gia',
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  starredOnly?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'false (mac dinh): an room dang hidden khoi list chinh; true: lay ca room hidden va khong hidden',
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeHidden?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'true: chi lay room dang hidden cua toi; false/bo qua: giu hanh vi includeHidden',
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  hiddenOnly?: boolean;
}
