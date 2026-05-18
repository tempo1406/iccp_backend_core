import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleResponse {
  @ApiProperty({ example: 'uuid-of-role' })
  id: string;

  @ApiProperty({ example: 'project_manager' })
  name: string;

  @ApiPropertyOptional({ example: 'Quản lý dự án trong tổ chức' })
  description?: string;

  @ApiProperty({ example: false, description: 'Có phải system role không' })
  isSystemRole: boolean;

  @ApiPropertyOptional({
    example: 'uuid-of-org',
    description: 'ID tổ chức (null nếu là system-level role)',
  })
  organizationId?: string;

  @ApiPropertyOptional({
    example: 'uuid-of-project',
    description: 'ID dự án',
  })
  projectId?: string;

  @ApiProperty({ example: 'uuid-of-creator' })
  createdBy: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
