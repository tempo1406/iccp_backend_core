import { ChatMemberRole } from '@modules/chat-box/room-management/entities/room-member.entity';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateRoomMemberRoleRequest {
  @ApiProperty({
    enum: ChatMemberRole,
    description: 'Role mới của member trong room',
    example: ChatMemberRole.ADMIN,
  })
  @IsEnum(ChatMemberRole)
  memberRole: ChatMemberRole;
}
