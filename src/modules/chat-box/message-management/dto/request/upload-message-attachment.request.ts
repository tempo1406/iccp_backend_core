import { ChatAttachmentType } from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const trimTransformedString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

export class UploadMessageAttachmentRequest {
  @ApiPropertyOptional({
    enum: ChatAttachmentType,
    example: ChatAttachmentType.IMAGE,
    description:
      'Tùy chọn. Nếu bỏ trống, server tự nhận diện theo mime type: image/* -> image, video/* -> video, audio/* -> audio, còn lại -> file.',
  })
  @IsOptional()
  @IsEnum(ChatAttachmentType)
  attachmentType?: ChatAttachmentType;

  @ApiPropertyOptional({
    example: 'sha256:5c58f26f5f6b7c3f...',
    description:
      'Checksum tùy chọn để kiểm tra toàn vẹn dữ liệu ở phía client.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  checksum?: string;

  @ApiPropertyOptional({
    example: 1920,
    description:
      'Chiều rộng (pixel) tùy chọn, hữu ích cho metadata preview ảnh/video.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({
    example: 1080,
    description:
      'Chiều cao (pixel) tùy chọn, hữu ích cho metadata preview ảnh/video.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({
    example: 4821,
    description: 'Thời lượng media (mili giây) tùy chọn.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMs?: number;

  @ApiPropertyOptional({
    example: 'banner_q2_launch_v1.png',
    description:
      'Tên hiển thị tùy chọn. Nếu bỏ trống, server dùng tên gốc của file upload.',
  })
  @IsOptional()
  @Transform(trimTransformedString)
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({
    example: 'upload-7d7e31df0f964ac2b8f2b7',
    description:
      'Key idempotency phia FE de retry upload an toan, tranh tao duplicate attachment',
  })
  @IsOptional()
  @Transform(trimTransformedString)
  @IsString()
  @MaxLength(100)
  clientUploadId?: string;
}
