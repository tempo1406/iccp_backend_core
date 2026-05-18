import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateOrgRoleRequest {
  @ApiProperty({
    example: 'project_lead',
    description: 'Tên role trong tổ chức (unique trong cùng org)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    example: 'Lead dự án trong tổ chức',
    description: 'Mô tả role',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ['documents.create', 'projects.view'],
    description: 'Danh sách permission codes gán ngay khi tạo role (optional)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsOptional()
  permissionCodes?: string[];
}
