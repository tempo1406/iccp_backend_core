import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSystemRoleRequest {
  @ApiProperty({ example: 'super_reviewer', description: 'Tên system role' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Review toàn bộ nội dung trong hệ thống',
    description: 'Mô tả role',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ['documents.create', 'analytics.view'],
    description:
      'Danh sách permission codes muốn gán luôn khi tạo role (optional)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionCodes?: string[];
}
