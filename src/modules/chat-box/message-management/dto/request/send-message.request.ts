import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import { ChatMessageType } from '@modules/chat-box/message-management/entities/message.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendMessageRequest {
  @ApiProperty({
    example: 'Hello team',
    description: 'Plain-text message content.',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    enum: ChatMessageContentFormat,
    description:
      'Message content format. Use rich_text_v1 when richContent is provided.',
  })
  @IsOptional()
  @IsEnum(ChatMessageContentFormat)
  contentFormat?: ChatMessageContentFormat;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Tiptap/ProseMirror JSON payload for rich-text content.',
  })
  @IsOptional()
  @IsObject()
  richContent?: Record<string, any>;

  @ApiPropertyOptional({
    enum: ChatMessageType,
    default: ChatMessageType.TEXT,
    description: 'Message type',
  })
  @IsOptional()
  @IsEnum(ChatMessageType)
  messageType?: ChatMessageType;

  @ApiPropertyOptional({
    example: 'client-1736154452000',
    description:
      'Client idempotency key (for example UUID/ULID). Retry with the same key returns the existing message.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientMessageId?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description:
      'Optional metadata. Supports metadata.mentionedUserIds: string[] with active room member UUIDs and metadata.specialMentions: [{ type: "channel" | "everyone" }].',
    example: {
      source: 'web',
      locale: 'vi',
      mentionedUserIds: ['8eb14979-fdf1-48fb-8eb8-8cf2015dc8de'],
      specialMentions: [{ type: 'channel' }],
    },
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Optional parent message UUID in the same room for reply/thread context.',
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string;
}
