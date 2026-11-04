import {
  ChatContextScope,
  ChatRoomType,
  ChatRoomVisibility,
} from '@modules/chat-box/room-management/entities/room.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateRoomRequest {
  @ApiPropertyOptional({
    enum: ChatRoomType,
    default: ChatRoomType.CHANNEL,
    description: 'Loai phong chat',
  })
  @IsOptional()
  @IsEnum(ChatRoomType)
  roomType?: ChatRoomType;

  @ApiPropertyOptional({
    enum: ChatRoomVisibility,
    default: ChatRoomVisibility.PUBLIC,
    description: 'Che do hien thi cua room',
  })
  @IsOptional()
  @IsEnum(ChatRoomVisibility)
  visibility?: ChatRoomVisibility;

  @ApiProperty({
    example: 'marketing-private',
    description: 'Ten room. Bat buoc voi channel, khuyen nghi co voi group_dm',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'marketing-private',
    description:
      'Khoa room duy nhat trong organization. Neu khong truyen se tu sinh',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  roomKey?: string;

  @ApiPropertyOptional({
    example: 'Kenh thao luan cua team',
    description: 'Topic ngan',
  })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({
    example: 'Channel cho team marketing noi bo',
    description: 'Mo ta chi tiet room',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ChatContextScope,
    default: ChatContextScope.ORGANIZATION,
    description:
      'Pham vi cua room. Phase hien tai chi ho tro organization | project; department se bi reject tam thoi.',
  })
  @IsOptional()
  @IsEnum(ChatContextScope)
  contextScope?: ChatContextScope;

  @ApiPropertyOptional({
    description:
      'contextId bat buoc khi contextScope = project; contextId la ID cua project tuong ung.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  contextId?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Danh sach user ID ban dau can them vao room (private/group). DM voi user khac: truyen 1 userId. Self-DM: bo trong memberIds hoac truyen chinh userId hien tai.',
    example: ['8eb14979-fdf1-48fb-8eb8-8cf2015dc8de'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds?: string[];
}
