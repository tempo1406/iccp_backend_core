import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnreadAggregatesResponse } from './unread-aggregates.response';

export class ReadStateResponse {
  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  roomId: string;

  @ApiProperty({ example: '447db699-827e-4cd9-9020-2438aa6882a9' })
  userId: string;

  @ApiPropertyOptional({ example: 'fd4f66c6-9a07-4c49-bf90-d82a8a6f27fa' })
  lastReadMessageId?: string;

  @ApiPropertyOptional({ example: '2026-03-14T10:22:11.120Z' })
  lastReadAt?: Date;

  @ApiProperty({
    example: 0,
    description: 'Số message chưa đọc do người khác gửi sau mốc lastReadAt',
  })
  unreadCount: number;

  @ApiProperty({
    example: false,
    description:
      'True khi current user da danh dau room nay bang action manual mark unread',
  })
  isManualUnreadByUser: boolean;

  @ApiPropertyOptional({ example: '2026-04-23T14:25:00.000Z' })
  manualUnreadAt?: Date;

  @ApiPropertyOptional({ example: 'fd4f66c6-9a07-4c49-bf90-d82a8a6f27fa' })
  manualUnreadFromMessageId?: string;

  @ApiPropertyOptional({ type: UnreadAggregatesResponse })
  afterAggregates?: UnreadAggregatesResponse;
}
