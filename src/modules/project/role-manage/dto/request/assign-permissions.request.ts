import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignPermissionsToProjectRoleRequest {
  @ApiProperty({
    example: 'uuid-of-role',
    description: 'ID của role trong project',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    example: ['projects.tasks.create', 'projects.tasks.update'],
    description: 'Danh sách permission codes muốn gán vào role',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionCodes: string[];
}
