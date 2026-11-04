import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleResponse } from './role.response';

export class MyRolePermissionsResponse {
  @ApiProperty({
    type: [RoleResponse],
    description: 'Danh sách roles của user',
  })
  roles: RoleResponse[];

  @ApiProperty({
    example: ['documents.create', 'projects.view'],
    description: 'Danh sách permission codes (deduplicated từ tất cả roles)',
    type: [String],
  })
  permissions: string[];

  @ApiPropertyOptional({
    example: 'uuid-of-org',
    description: 'ID tổ chức nếu query theo org context',
  })
  organizationId?: string;
}
