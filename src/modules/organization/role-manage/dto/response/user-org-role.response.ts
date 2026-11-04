import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserOrgRoleResponse {
  @ApiProperty({ example: 'uuid-of-user-role' })
  id: string;

  @ApiProperty({ example: 'uuid-of-role' })
  roleId: string;

  @ApiProperty({ example: 'member' })
  roleName: string;

  @ApiProperty({ example: 'Default member role for organization' })
  roleDescription?: string;

  @ApiProperty({ example: 'organization', enum: ['organization', 'project'] })
  scopeType: string;

  @ApiProperty({
    example: 'uuid-of-project',
    description:
      'Project ID nếu scopeType = project, null nếu scopeType = organization',
    nullable: true,
  })
  scopeId?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  assignedAt: Date;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'Soft-delete timestamp của role. Null nếu role chưa bị xóa.',
  })
  deletedAt?: Date | null;
}
