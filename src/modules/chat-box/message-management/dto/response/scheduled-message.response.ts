import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import { ChatScheduledMessageStatus } from '@modules/chat-box/message-management/entities/scheduled-message.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduledMessageResponse {
  @ApiProperty({ example: '936af9ba-c2ca-4a89-9bf4-2f4b789ddf9f' })
  id: string;

  @ApiProperty({ example: '3eec6b5f-98aa-4d86-84bf-8f7071aebd26' })
  organizationId: string;

  @ApiProperty({ example: '484f4ec0-94a8-40ce-9ee7-4496fdf14c5c' })
  roomId: string;

  @ApiProperty({ example: 'c171cb58-f4ca-4f43-95d4-cfb1225f6456' })
  authorUserId: string;

  @ApiPropertyOptional({ example: '713f6a8b-7558-4697-95d4-e4df54bdb7d8' })
  threadRootMessageId?: string;

  @ApiPropertyOptional({ example: '713f6a8b-7558-4697-95d4-e4df54bdb7d8' })
  parentMessageId?: string;

  @ApiPropertyOptional({ example: 'Reminder: release freeze starts tonight' })
  content?: string;

  @ApiProperty({
    enum: ChatMessageContentFormat,
    example: ChatMessageContentFormat.PLAIN_TEXT,
  })
  contentFormat: ChatMessageContentFormat;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  richContent?: Record<string, any>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, any>;

  @ApiProperty({ example: '2026-03-24T02:00:00.000Z' })
  scheduledForUtc: Date;

  @ApiProperty({ example: 'Asia/Bangkok' })
  scheduledTimezone: string;

  @ApiProperty({ example: '2026-03-24' })
  scheduledLocalDate: string;

  @ApiProperty({ example: '09:00' })
  scheduledLocalTime: string;

  @ApiProperty({
    enum: ChatScheduledMessageStatus,
    example: ChatScheduledMessageStatus.PENDING,
  })
  status: ChatScheduledMessageStatus;

  @ApiPropertyOptional({ example: 'f63b58e0-2f84-4ddc-97b8-3081fa82dd5f' })
  sourceDraftId?: string;

  @ApiPropertyOptional({ example: '3b2ad427-d5a1-4af3-a1f3-ec4a6af43506' })
  sentMessageId?: string;

  @ApiPropertyOptional({ example: 'scheduled_message_dispatch_failed' })
  lastErrorCode?: string;

  @ApiPropertyOptional({ example: 'Cannot send message to archived room' })
  lastErrorMessage?: string;

  @ApiPropertyOptional({ example: '2026-03-24T02:00:00.000Z' })
  sentAt?: Date;

  @ApiPropertyOptional({ example: '2026-03-24T01:58:30.000Z' })
  cancelledAt?: Date;

  @ApiProperty({ example: '2026-03-23T11:20:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-23T11:20:00.000Z' })
  updatedAt: Date;
}
