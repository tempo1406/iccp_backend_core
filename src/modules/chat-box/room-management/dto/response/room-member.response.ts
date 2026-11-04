import {
  ChatHiddenReason,
  ChatJoinSource,
  ChatMemberRole,
  ChatNotifyLevel,
} from '@modules/chat-box/room-management/entities/room-member.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomMemberResponse {
  @ApiProperty({ example: '8eb14979-fdf1-48fb-8eb8-8cf2015dc8de' })
  userId: string;

  @ApiProperty({
    enum: ChatMemberRole,
    example: ChatMemberRole.MEMBER,
  })
  memberRole: ChatMemberRole;

  @ApiProperty({
    enum: ChatJoinSource,
    example: ChatJoinSource.MANUAL,
  })
  joinSource: ChatJoinSource;

  @ApiProperty({
    enum: ChatNotifyLevel,
    example: ChatNotifyLevel.ALL,
  })
  notifyLevel: ChatNotifyLevel;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: false })
  isHidden: boolean;

  @ApiPropertyOptional({
    enum: ChatHiddenReason,
    example: ChatHiddenReason.MANUAL_HIDE,
  })
  hiddenReason?: ChatHiddenReason;

  @ApiPropertyOptional({ example: '2026-03-11T10:10:00.000Z' })
  hiddenAt?: Date;

  @ApiProperty({ example: '2026-03-11T01:10:00.000Z' })
  joinedAt: Date;

  @ApiPropertyOptional({ example: '2026-03-11T10:10:00.000Z' })
  leftAt?: Date;

  @ApiPropertyOptional({ example: 'team.user@iccp.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'Quoc' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Nguyen' })
  lastName?: string;
}
