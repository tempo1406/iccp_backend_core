import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateScheduledMessageRequest {
  @ApiPropertyOptional({
    description: 'Thread root message ID for thread composer context',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  threadRootMessageId?: string;

  @ApiPropertyOptional({
    description: 'Parent message ID for reply composer context',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string;

  @ApiPropertyOptional({
    description: 'Scheduled message plain-text content',
    example: 'Reminder: standup starts in 15 minutes',
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
    description: 'Scheduled message rich editor payload',
  })
  @IsOptional()
  @IsObject()
  richContent?: Record<string, any>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Scheduled message metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Target datetime in ISO-8601 with timezone offset',
    example: '2026-03-24T09:00:00+07:00',
  })
  @IsString()
  @IsISO8601()
  scheduledFor: string;

  @ApiProperty({
    description: 'IANA timezone ID',
    example: 'Asia/Bangkok',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  timezone: string;

  @ApiPropertyOptional({
    description: 'Optional source draft ID to remove after schedule creation',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  sourceDraftId?: string;
}
