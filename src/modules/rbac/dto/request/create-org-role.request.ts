import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSystemOrgRoleRequest {
  @ApiProperty({ example: 'project_manager', description: 'Tên role' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Quản lý dự án trong tổ chức',
    description: 'Mô tả role',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ['documents.create', 'projects.view'],
    description:
      'Danh sách permission codes muốn gán luôn khi tạo role (optional)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionCodes?: string[];
}
