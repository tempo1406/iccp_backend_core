import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import { ChatMessageType } from '@modules/chat-box/message-management/entities/message.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LinkPreviewResponse } from './link-preview.response';
import { MessageAttachmentResponse } from './message-attachment.response';
import { MessageReactionSummaryResponse } from './message-reaction-summary.response';

export class RoomMessageReplyPreviewResponse {
  @ApiProperty({ example: 'fd4f66c6-9a07-4c49-bf90-d82a8a6f27fa' })
  id: string;

  @ApiPropertyOptional({ example: 'Reply target message content' })
  content?: string;

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

  @ApiPropertyOptional({ example: '2026-03-11T05:10:00.000Z' })
  sentAt?: Date;
}

export class RoomMessageResponse {
  @ApiProperty({ example: '2f4b1046-1280-4e8d-815f-59d51b7ebc2e' })
  id: string;

  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  roomId: string;

  @ApiProperty({ example: 'ebf11c0a-f8ac-4ddf-ad81-9e7c98ea1cd5' })
  organizationId: string;

  @ApiPropertyOptional({ example: '6e882f55-74d2-4f5f-b1df-7862908bd465' })
  senderId?: string;

  @ApiProperty({ enum: ChatMessageType, example: ChatMessageType.TEXT })
  messageType: ChatMessageType;

  @ApiPropertyOptional({ example: 'Hello team' })
  content?: string;

  @ApiProperty({
    enum: ChatMessageContentFormat,
    example: ChatMessageContentFormat.PLAIN_TEXT,
  })
  contentFormat: ChatMessageContentFormat;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Rich-text JSON payload for renderer-capable clients.',
  })
  richContent?: Record<string, any>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { source: 'web', locale: 'vi' },
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: 'client-1736154452000' })
  clientMessageId?: string;

  @ApiPropertyOptional({
    example: 'fd4f66c6-9a07-4c49-bf90-d82a8a6f27fa',
    description: 'Parent message ID when this message is a reply',
  })
  parentMessageId?: string;

  @ApiPropertyOptional({
    example: 'fd4f66c6-9a07-4c49-bf90-d82a8a6f27fa',
    description: 'Thread root message ID for reply chains',
  })
  threadRootMessageId?: string;

  @ApiPropertyOptional({
    type: RoomMessageReplyPreviewResponse,
    description:
      'Minimal parent-message snapshot so FE can render reply preview after refetch/reload.',
  })
  replyPreview?: RoomMessageReplyPreviewResponse;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description:
      'Snapshot for forwarded-message card rendering without extra API fetch.',
  })
  forwardedSnapshot?: Record<string, any>;

  @ApiPropertyOptional({
    type: [MessageAttachmentResponse],
    description: 'Attachments linked to this message',
  })
  attachments?: MessageAttachmentResponse[];

  @ApiPropertyOptional({
    type: [LinkPreviewResponse],
    description: 'Resolved URL previews from the message content',
  })
  linkPreviews?: LinkPreviewResponse[];

  @ApiPropertyOptional({
    type: [MessageReactionSummaryResponse],
    description:
      'Inline reaction summaries so FE does not need fan-out requests per message.',
  })
  reactionSummaries?: MessageReactionSummaryResponse[];

  @ApiProperty({ example: false })
  isEdited: boolean;

  @ApiProperty({ example: false })
  isDeleted: boolean;

  @ApiProperty({ example: '2026-03-11T05:15:00.000Z' })
  sentAt: Date;

  @ApiPropertyOptional({ example: 'team.user@iccp.com' })
  senderEmail?: string;

  @ApiPropertyOptional({ example: 'Quoc' })
  senderFirstName?: string;

  @ApiPropertyOptional({ example: 'Nguyen' })
  senderLastName?: string;

  @ApiPropertyOptional({
    example: 'https://ik.imagekit.io/your-space/avatar-sender.png',
  })
  senderAvatarUrl?: string;
}
