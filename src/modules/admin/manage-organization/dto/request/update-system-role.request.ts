import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSystemRoleRequest {
  @ApiPropertyOptional({
    example: 'super_reviewer_v2',
    description: 'System role name',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description for system role',
    description: 'Description for system role',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({
    example: ['documents.create', 'projects.view'],
    description:
      'Target permission codes for this role. Sending this field will sync (add/remove) role permissions.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[];
}
