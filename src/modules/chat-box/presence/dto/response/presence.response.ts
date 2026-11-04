import { ChatPresenceStatus } from '@modules/chat-box/presence/entities/user-presence.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresenceResponse {
  @ApiProperty({ example: '8eb14979-fdf1-48fb-8eb8-8cf2015dc8de' })
  userId: string;

  @ApiProperty({ example: 'ebf11c0a-f8ac-4ddf-ad81-9e7c98ea1cd5' })
  organizationId: string;

  @ApiProperty({ enum: ChatPresenceStatus, example: ChatPresenceStatus.ONLINE })
  presenceStatus: ChatPresenceStatus;

  @ApiPropertyOptional({ example: 'Đang họp' })
  customStatus?: string;

  @ApiPropertyOptional({ example: ':spiral_calendar_pad:' })
  customEmoji?: string;

  @ApiPropertyOptional({ example: 'web' })
  source?: string;

  @ApiPropertyOptional({ example: '2026-03-11T05:30:00.000Z' })
  lastSeenAt?: Date;

  @ApiPropertyOptional({ example: '2026-03-11T05:30:00.000Z' })
  lastActivityAt?: Date;

  @ApiProperty({ example: '2026-03-11T05:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: 'team.user@iccp.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'Quoc' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Nguyen' })
  lastName?: string;
}
