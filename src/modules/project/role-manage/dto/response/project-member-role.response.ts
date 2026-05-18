import { ApiProperty } from '@nestjs/swagger';

export class ProjectMemberRoleResponse {
  @ApiProperty({ example: 'uuid-of-user-role' })
  id: string;

  @ApiProperty({ example: 'uuid-of-role' })
  roleId: string;

  @ApiProperty({ example: 'developer' })
  roleName: string;

  @ApiProperty({ example: 'Developer role cho project' })
  roleDescription?: string;

  @ApiProperty({ example: 'project' })
  scopeType: string;

  @ApiProperty({ example: 'uuid-of-project' })
  scopeId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  assignedAt: Date;
}
