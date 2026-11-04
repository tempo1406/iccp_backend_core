import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MessageLinkPreviewResolveState,
  MessageLinkPreviewRoomResponse,
} from './message-link-preview.response';
import { RoomMessageResponse } from './room-message.response';

export class RoomMessageContextResponse {
  @ApiProperty({ example: true })
  accessible: boolean;

  @ApiProperty({
    enum: ['ready', 'forbidden', 'message_not_found', 'message_deleted'],
    example: 'ready',
  })
  state: MessageLinkPreviewResolveState;

  @ApiProperty({ type: MessageLinkPreviewRoomResponse })
  room: MessageLinkPreviewRoomResponse;

  @ApiProperty({ example: '71f1cf08-e67c-4222-bfed-884848f2b137' })
  targetMessageId: string;

  @ApiProperty({ type: [RoomMessageResponse] })
  items: RoomMessageResponse[];

  @ApiPropertyOptional({
    example:
      'eyJzZW50QXQiOiIyMDI2LTAzLTI1VDIxOjQxOjAwLjAwMFoiLCJpZCI6Im0tMDAxIn0',
  })
  olderCursor?: string;

  @ApiPropertyOptional({
    example:
      'eyJzZW50QXQiOiIyMDI2LTAzLTI1VDIxOjQ2OjAwLjAwMFoiLCJpZCI6Im0tMDAyIn0',
  })
  newerCursor?: string;

  @ApiProperty({ example: true })
  hasOlder: boolean;

  @ApiProperty({ example: true })
  hasNewer: boolean;

  @ApiProperty({
    example:
      '/team-chat?roomId=47e7a79a-20b7-4a4f-bfe2-122eaa8fee78&messageId=71f1cf08-e67c-4222-bfed-884848f2b137',
  })
  deepLinkUrl: string;
}
