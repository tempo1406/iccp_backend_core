import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectRoleDetailResponse {
  @ApiProperty({ example: 'uuid-of-role' })
  id: string;

  @ApiProperty({ example: 'developer' })
  name: string;

  @ApiPropertyOptional({ example: 'Developer role cho project' })
  description?: string;

  @ApiProperty({ example: false })
  isSystemRole: boolean;

  @ApiPropertyOptional({ example: 'uuid-of-org' })
  organizationId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-project' })
  projectId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-creator' })
  createdBy?: string;

  @ApiProperty({
    example: ['projects.tasks.create', 'projects.tasks.update'],
    description: 'Danh sách permission codes của role',
    type: [String],
  })
  permissions: string[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
