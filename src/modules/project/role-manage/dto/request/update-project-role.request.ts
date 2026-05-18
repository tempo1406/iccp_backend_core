import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProjectRoleRequest {
  @ApiPropertyOptional({
    example: 'senior_developer',
    description: 'Tên role mới',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Senior developer role trong project',
    description: 'Mô tả role mới',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
