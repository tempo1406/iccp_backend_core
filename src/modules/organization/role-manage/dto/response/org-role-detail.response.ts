import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrgRoleDetailResponse {
  @ApiProperty({ example: 'uuid-of-role' })
  id: string;

  @ApiProperty({ example: 'project_manager' })
  name: string;

  @ApiPropertyOptional({ example: 'Quản lý dự án trong tổ chức' })
  description?: string;

  @ApiProperty({ example: false })
  isSystemRole: boolean;

  @ApiProperty({ example: 'uuid-of-org' })
  organizationId: string;

  @ApiPropertyOptional({ example: 'uuid-of-creator' })
  createdBy?: string;

  @ApiProperty({
    example: ['documents.create', 'projects.view'],
    description: 'Danh sách permission codes của role',
    type: [String],
  })
  permissions: string[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
