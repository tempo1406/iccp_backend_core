import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AccessRuleItem } from '@modules/document/access/dto/request/create-access-rule.request';

export class UploadDocumentRequest {
  @ApiProperty({
    description: 'Tiêu đề tài liệu',
    example: 'Nội quy công ty 2025',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ description: 'Mô tả tài liệu' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'ID folder chứa tài liệu (null = root)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({
    description: 'ID category phân loại tài liệu',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Phạm vi truy cập',
    enum: ['private', 'organization', 'project', 'role', 'user', 'system'],
    default: 'organization',
  })
  @IsIn(['private', 'organization', 'project', 'role', 'user', 'system'])
  @IsOptional()
  accessScope?: string;

  @ApiPropertyOptional({ type: [AccessRuleItem] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AccessRuleItem)
  @Transform(({ value }) => {
    if (!value) return [];
    try {
      return JSON.parse(value as string) as AccessRuleItem[];
    } catch {
      return [];
    }
  })
  rules?: AccessRuleItem[];
}
