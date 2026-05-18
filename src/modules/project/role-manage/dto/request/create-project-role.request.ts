import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProjectRoleRequest {
  @ApiProperty({
    example: 'developer',
    description: 'Tên role trong project (unique trong cùng project context)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    example: 'Developer role cho project',
    description: 'Mô tả role',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ['projects.tasks.create', 'projects.tasks.update'],
    description: 'Danh sách permission codes gán ngay khi tạo role (optional)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsOptional()
  permissionCodes?: string[];
}
