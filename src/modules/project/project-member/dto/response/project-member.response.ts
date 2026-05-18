import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectMemberResponse {
  @ApiProperty({ example: '8f0bc90e-9d5f-4c66-9e10-8ae567f2d8ea' })
  id: string;

  @ApiProperty({ example: 'f8f1e2ff-7f9d-4ce2-9301-a497f376facd' })
  projectId: string;

  @ApiProperty({ example: '18d17aea-7e8c-4a58-8e56-74c2949dcdd6' })
  organizationId: string;

  @ApiProperty({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  userId: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'member@iccp.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar/a.png' })
  avatar?: string;

  @ApiPropertyOptional({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  roleId?: string;

  @ApiPropertyOptional({ example: 'project_manager' })
  roleName?: string;

  @ApiPropertyOptional({
    example: ['4b6f223b-2e53-4698-aa8e-6570f6cb2f60'],
    type: [String],
  })
  roleIds?: string[];

  @ApiPropertyOptional({
    example: ['project_manager'],
    type: [String],
  })
  roleNames?: string[];

  @ApiPropertyOptional({
    example: [
      {
        id: 'uuid-of-user-role',
        roleId: 'uuid-of-role',
        roleName: 'project_manager',
        roleDescription: 'Manager role cho project',
        scopeType: 'project',
        scopeId: 'uuid-of-project',
        assignedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    type: [Object],
  })
  roles?: Array<{
    id: string;
    roleId: string;
    roleName: string;
    roleDescription?: string;
    scopeType: string;
    scopeId: string;
    assignedAt: Date;
  }>;

  @ApiPropertyOptional({
    example: 6,
    description: 'Allocated working hours per day for this member in this project',
  })
  allocatedHoursPerDay?: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  joinedAt: Date;

  @ApiProperty()
  createdAt: Date;
}
