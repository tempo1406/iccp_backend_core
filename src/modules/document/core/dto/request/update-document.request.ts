import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateDocumentRequest {
  @ApiPropertyOptional({
    description: 'Tiêu đề mới',
    example: 'Nội quy công ty 2026',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ description: 'Mô tả mới' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Chuyển sang folder khác (null = root)' })
  @IsUUID()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Đổi category phân loại' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Phạm vi truy cập',
    enum: ['private', 'organization', 'project', 'role', 'user'],
  })
  @IsIn(['private', 'organization', 'project', 'role', 'user'])
  @IsOptional()
  accessScope?: string;
}
