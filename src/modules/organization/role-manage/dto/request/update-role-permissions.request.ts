import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class UpdateRolePermissionsRequest {
  @ApiProperty({
    example: ['documents.create', 'projects.view'],
    description:
      'Danh sách permission codes caller muốn giữ lại trong phạm vi mình được phép quản lý',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionCodes: string[];
}
