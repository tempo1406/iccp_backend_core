import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateScheduledMessageRequest {
  @ApiPropertyOptional({
    description: 'Updated plain-text content',
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
    description: 'Updated rich editor payload',
  })
  @IsOptional()
  @IsObject()
  richContent?: Record<string, any>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Updated metadata payload',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Updated schedule datetime in ISO-8601 format',
    example: '2026-03-24T09:00:00+07:00',
  })
  @IsOptional()
  @IsString()
  @IsISO8601()
  scheduledFor?: string;

  @ApiPropertyOptional({
    description: 'Updated IANA timezone ID',
    example: 'Asia/Bangkok',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}
