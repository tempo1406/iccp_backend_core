import { ChatMentionType } from '@modules/chat-box/message-management/entities/message-mention.entity';
import { ChatRoomVisibility } from '@modules/chat-box/room-management/entities/room.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MentionResponse {
  @ApiProperty({ example: 'd4ce4c98-1fb7-4db9-86df-d8af9d0436d4' })
  mentionId: string;

  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  roomId: string;

  @ApiProperty({ example: 'fd4f66c6-9a07-4c49-bf90-d82a8a6f27fa' })
  messageId: string;

  @ApiProperty({ enum: ChatMentionType, example: ChatMentionType.USER })
  mentionType: ChatMentionType;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiPropertyOptional({ example: '2026-03-14T11:25:00.000Z' })
  readAt?: Date;

  @ApiPropertyOptional({ example: 'Nho ban review ho ticket #123' })
  messageContent?: string;

  @ApiProperty({ example: '2026-03-14T11:20:00.000Z' })
  messageSentAt: Date;

  @ApiPropertyOptional({ example: 'reviewer@iccp.com' })
  senderEmail?: string;

  @ApiPropertyOptional({ example: 'Reviewer' })
  senderFirstName?: string;

  @ApiPropertyOptional({ example: 'Nguyen' })
  senderLastName?: string;

  @ApiPropertyOptional({
    example: 'https://ik.imagekit.io/your-space/avatar-reviewer.png',
  })
  senderAvatarUrl?: string;

  @ApiPropertyOptional({ example: 'marketing-private' })
  roomName?: string;

  @ApiPropertyOptional({ enum: ChatRoomVisibility, example: 'public' })
  roomVisibility?: ChatRoomVisibility;
}
