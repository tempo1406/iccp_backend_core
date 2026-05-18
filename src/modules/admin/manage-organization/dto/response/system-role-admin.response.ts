import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SystemRoleAdminResponse {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'System role ID',
  })
  id: string;

  @ApiProperty({
    example: 'system_admin',
    description: 'System role name',
  })
  name: string;

  @ApiPropertyOptional({
    example: 'Super admin role',
    description: 'System role description',
  })
  description?: string;

  @ApiProperty({
    example: true,
    description: 'true for global system roles',
  })
  isSystemRole: boolean;

  @ApiProperty({
    example: '2026-01-01T00:00:00.000Z',
    description: 'Created timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-01-02T00:00:00.000Z',
    description: 'Updated timestamp',
  })
  updatedAt: Date;

  @ApiProperty({
    example: ['documents.create', 'projects.view'],
    description: 'Permission codes assigned to this role',
    type: [String],
  })
  permissionCodes: string[];
}
