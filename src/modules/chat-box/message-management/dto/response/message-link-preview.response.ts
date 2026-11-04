import {
  ChatRoomType,
  ChatRoomVisibility,
} from '@modules/chat-box/room-management/entities/room.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type MessageLinkPreviewResolveState =
  | 'ready'
  | 'forbidden'
  | 'message_not_found'
  | 'message_deleted';

export class MessageLinkPreviewRoomResponse {
  @ApiProperty({ example: '47e7a79a-20b7-4a4f-bfe2-122eaa8fee78' })
  id: string;

  @ApiProperty({ enum: ChatRoomType, example: ChatRoomType.CHANNEL })
  roomType: ChatRoomType;

  @ApiProperty({ enum: ChatRoomVisibility, example: ChatRoomVisibility.PUBLIC })
  visibility: ChatRoomVisibility;

  @ApiPropertyOptional({ example: 'product-updates' })
  name?: string;

  @ApiPropertyOptional({ example: 'product-updates' })
  roomKey?: string;
}

export class MessageLinkPreviewMessageResponse {
  @ApiProperty({ example: '71f1cf08-e67c-4222-bfed-884848f2b137' })
  id: string;

  @ApiPropertyOptional({ example: '545390ea-3f05-4998-a35f-f78805045a9b' })
  authorId?: string;

  @ApiPropertyOptional({ example: 'Bo Bui' })
  authorName?: string;

  @ApiPropertyOptional({
    example: 'https://ik.imagekit.io/xxx/avatar-bobui.png',
  })
  authorAvatarUrl?: string;

  @ApiPropertyOptional({
    example: 'Please check the deployment note before 6 PM',
    description:
      'Safe short preview for internal message card. Hidden when user has no access.',
  })
  contentPreview?: string;

  @ApiPropertyOptional({ example: '2026-03-30T10:15:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ example: false })
  isDeleted: boolean;

  @ApiProperty({ example: false })
  hasAttachments: boolean;
}

export class MessageLinkPreviewResponse {
  @ApiProperty({ example: true })
  accessible: boolean;

  @ApiProperty({
    enum: ['ready', 'forbidden', 'message_not_found', 'message_deleted'],
    example: 'ready',
  })
  state: MessageLinkPreviewResolveState;

  @ApiProperty({ type: MessageLinkPreviewRoomResponse })
  room: MessageLinkPreviewRoomResponse;

  @ApiPropertyOptional({ type: MessageLinkPreviewMessageResponse })
  message?: MessageLinkPreviewMessageResponse;

  @ApiProperty({
    example:
      '/team-chat?roomId=47e7a79a-20b7-4a4f-bfe2-122eaa8fee78&messageId=71f1cf08-e67c-4222-bfed-884848f2b137',
  })
  deepLinkUrl: string;
}
