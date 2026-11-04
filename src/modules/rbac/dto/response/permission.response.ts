import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponse {
  @ApiProperty({ example: 'uuid-of-permission' })
  id: string;

  @ApiProperty({ example: 'documents.create' })
  code: string;

  @ApiProperty({ example: 'Create Document' })
  name: string;

  @ApiProperty({
    example: 'documents',
    description: 'Module sở hữu permission',
  })
  module: string;
}
