import { ChatRoomType } from '@modules/chat-box/room-management/entities/room.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UnreadCountResponse {
  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  roomId: string;

  @ApiPropertyOptional({ example: 'marketing-private' })
  roomName?: string;

  @ApiProperty({ enum: ChatRoomType, example: ChatRoomType.CHANNEL })
  roomType: ChatRoomType;

  @ApiProperty({ example: 3 })
  unreadCount: number;

  @ApiPropertyOptional({ example: 'fd4f66c6-9a07-4c49-bf90-d82a8a6f27fa' })
  lastReadMessageId?: string;

  @ApiPropertyOptional({ example: '2026-03-14T10:22:11.120Z' })
  lastReadAt?: Date;

  @ApiPropertyOptional({ example: '2026-03-14T10:35:44.000Z' })
  lastMessageAt?: Date;
}
