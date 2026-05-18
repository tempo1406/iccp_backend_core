import { ChatMessageType } from '@modules/chat-box/message-management/entities/message.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoomMessageSearchItemResponse {
  @ApiProperty({ example: 'fd4f66c6-9a07-4c49-bf90-d82a8a6f27fa' })
  messageId: string;

  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  roomId: string;

  @ApiPropertyOptional({ example: '6e882f55-74d2-4f5f-b1df-7862908bd465' })
  senderId?: string;

  @ApiPropertyOptional({ example: 'team.user@iccp.com' })
  senderEmail?: string;

  @ApiPropertyOptional({ example: 'Quoc' })
  senderFirstName?: string;

  @ApiPropertyOptional({ example: 'Nguyen' })
  senderLastName?: string;

  @ApiPropertyOptional({
    example: 'https://ik.imagekit.io/your-space/avatar-user.png',
  })
  senderAvatarUrl?: string;

  @ApiProperty({ enum: ChatMessageType, example: ChatMessageType.TEXT })
  messageType: ChatMessageType;

  @ApiPropertyOptional({ example: 'Noi dung goc cua message' })
  content?: string;

  @ApiProperty({
    example: '...dong nay co chua tu khoa marketing plan...',
    description: 'Trich doan ngan de FE highlight nhanh',
  })
  snippet: string;

  @ApiProperty({ example: '2026-03-18T03:00:00.000Z' })
  sentAt: Date;
}

export class SearchRoomMessagesResponse {
  @ApiProperty({ type: [RoomMessageSearchItemResponse] })
  items: RoomMessageSearchItemResponse[];

  @ApiProperty({ example: true })
  hasMore: boolean;

  @ApiPropertyOptional({
    example: '2026-03-18T02:58:10.000Z',
    description:
      'Cursor tiep theo. FE truyen lai vao query cursor de lay trang sau.',
  })
  nextCursor?: string;
}
