import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageAttachmentResponse } from './message-attachment.response';
import { RoomMessageResponse } from './room-message.response';

export class ForwardMessageTargetResultResponse {
  @ApiProperty({ example: '47e7a79a-20b7-4a4f-bfe2-122eaa8fee78' })
  targetRoomId: string;

  @ApiProperty({ example: true })
  forwarded: boolean;

  @ApiPropertyOptional({ type: RoomMessageResponse })
  message?: RoomMessageResponse;

  @ApiPropertyOptional({
    type: [MessageAttachmentResponse],
    description:
      'Danh sach attachment duoc clone sang message moi (neu message nguon co media/file)',
  })
  attachments?: MessageAttachmentResponse[];

  @ApiPropertyOptional({
    example: 'You do not have permission to send message',
  })
  error?: string;
}

export class ForwardMessageResponse {
  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  sourceRoomId: string;

  @ApiProperty({ example: '71f1cf08-e67c-4222-bfed-884848f2b137' })
  sourceMessageId: string;

  @ApiProperty({ example: 2 })
  requestedTargetCount: number;

  @ApiProperty({ example: 1 })
  forwardedCount: number;

  @ApiProperty({ example: 1 })
  failedCount: number;

  @ApiProperty({ type: [ForwardMessageTargetResultResponse] })
  results: ForwardMessageTargetResultResponse[];
}
