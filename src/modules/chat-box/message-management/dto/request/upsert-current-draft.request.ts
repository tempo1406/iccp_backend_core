import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import { ChatMessageDraftSource } from '@modules/chat-box/message-management/entities/message-draft.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpsertCurrentDraftRequest {
  @ApiPropertyOptional({
    description: 'Thread root message id for thread composer context',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  threadRootMessageId?: string;

  @ApiPropertyOptional({
    description: 'Parent message id for reply composer context',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string;

  @ApiPropertyOptional({
    description: 'Draft plain text content',
    example: 'Please review this before tomorrow',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    enum: ChatMessageContentFormat,
    description:
      'Draft content format. Use rich_text_v1 when richContent is provided.',
  })
  @IsOptional()
  @IsEnum(ChatMessageContentFormat)
  contentFormat?: ChatMessageContentFormat;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Draft rich editor payload',
    example: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
    },
  })
  @IsOptional()
  @IsObject()
  richContent?: Record<string, any>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Extra draft metadata from composer',
    example: { mentionQuery: '@bo', attachments: [] },
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    enum: ChatMessageDraftSource,
    description: 'Draft source for audit/debug',
    default: ChatMessageDraftSource.COMPOSER_AUTOSAVE,
  })
  @IsOptional()
  @IsEnum(ChatMessageDraftSource)
  draftSource?: ChatMessageDraftSource;

  @ApiPropertyOptional({
    description: 'Optional client-side draft version token',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientDraftVersion?: string;
}
