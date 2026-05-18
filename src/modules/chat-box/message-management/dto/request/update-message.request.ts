import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateMessageRequest {
  @ApiPropertyOptional({
    example: 'Update message content',
    description: 'Updated plain-text message content',
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
    description: 'Updated Tiptap/ProseMirror JSON payload.',
  })
  @IsOptional()
  @IsObject()
  richContent?: Record<string, any>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Updated metadata (optional)',
    example: { source: 'web', locale: 'vi' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Attachment IDs to remove during edit (supports attachment card close action).',
    example: ['27c5d8a7-4a78-42ec-9f49-cf70c8ed47a3'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  removeAttachmentIds?: string[];
}
