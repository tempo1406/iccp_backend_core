import { ChatMemberRole } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class InviteRoomMembersRequest {
  @ApiProperty({
    type: [String],
    example: ['8eb14979-fdf1-48fb-8eb8-8cf2015dc8de'],
    description: 'Danh sách user ID cần mời vào room',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiPropertyOptional({
    enum: ChatMemberRole,
    default: ChatMemberRole.MEMBER,
    description: 'Role mặc định khi người dùng chấp nhận lời mời',
  })
  @IsOptional()
  @IsEnum(ChatMemberRole)
  memberRole?: ChatMemberRole;

  @ApiPropertyOptional({
    example: 'Chào mừng bạn vào channel private',
    description: 'Lời nhắn mời',
  })
  @IsOptional()
  @IsString()
  inviteMessage?: string;
}
