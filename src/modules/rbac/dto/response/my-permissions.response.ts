import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MyPermissionsResponse {
  @ApiProperty({
    example: ['documents.create', 'projects.view'],
    description: 'Danh sách permission codes của user',
    type: [String],
  })
  permissions: string[];

  @ApiPropertyOptional({
    example: 'uuid-of-org',
    description: 'ID tổ chức (nếu query theo org context)',
  })
  organizationId?: string;
}
