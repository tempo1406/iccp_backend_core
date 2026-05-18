import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateRoleRequest {
  @ApiPropertyOptional({ example: 'project_lead', description: 'Tên role mới' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Lead dự án trong tổ chức',
    description: 'Mô tả role mới',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
