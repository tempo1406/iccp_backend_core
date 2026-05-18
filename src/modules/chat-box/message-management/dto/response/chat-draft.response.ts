import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import { ChatMessageDraftSource } from '@modules/chat-box/message-management/entities/message-draft.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatDraftResponse {
  @ApiProperty({ example: 'd53303f1-76f9-4ad9-a17e-f23ae58f16dc' })
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

  @ApiPropertyOptional({ example: 'Reminder for tomorrow standup' })
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

  @ApiProperty({
    enum: ChatMessageDraftSource,
    example: ChatMessageDraftSource.COMPOSER_AUTOSAVE,
  })
  draftSource: ChatMessageDraftSource;

  @ApiProperty({ example: '2026-03-23T11:20:00.000Z' })
  lastComposerActivityAt: Date;

  @ApiProperty({ example: '2026-03-23T11:20:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-23T11:20:00.000Z' })
  updatedAt: Date;
}
