import { ChatAttachmentType } from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

const trimTransformedString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

export class CompleteDirectUploadAttachmentRequest {
  @ApiProperty({
    example:
      'https://ik.imagekit.io/your-space/chat/org-1/room-1/proposal-q2.docx',
  })
  @IsUrl({
    require_protocol: true,
  })
  fileUrl: string;

  @ApiProperty({
    example: 'proposal-q2.docx',
  })
  @Transform(trimTransformedString)
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiPropertyOptional({
    enum: ChatAttachmentType,
    description:
      'Tuy chon. Neu bo trong backend se suy luan theo mime type/file extension',
  })
  @IsOptional()
  @IsEnum(ChatAttachmentType)
  attachmentType?: ChatAttachmentType;

  @ApiPropertyOptional({
    example:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  @IsOptional()
  @Transform(trimTransformedString)
  @IsString()
  @MaxLength(150)
  mimeType?: string;

  @ApiPropertyOptional({ example: 220313 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fileSize?: number;

  @ApiPropertyOptional({ example: 'sha256:5c58f26f5f6b7c3f...' })
  @IsOptional()
  @Transform(trimTransformedString)
  @IsString()
  @MaxLength(128)
  checksum?: string;

  @ApiPropertyOptional({ example: 1920 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ example: 1080 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ example: 4821 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMs?: number;

  @ApiPropertyOptional({
    example: 'upload-7d7e31df0f964ac2b8f2b7',
    description:
      'Key idempotency phia FE de retry complete upload ma khong tao duplicate',
  })
  @IsOptional()
  @Transform(trimTransformedString)
  @IsString()
  @MaxLength(100)
  clientUploadId?: string;
}
