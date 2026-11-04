import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignPermissionsToOrgRoleRequest {
  @ApiProperty({
    example: 'uuid-of-role',
    description: 'ID của role trong org',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    example: ['documents.create', 'projects.view'],
    description: 'Danh sách permission codes muốn gán vào role',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionCodes: string[];
}
