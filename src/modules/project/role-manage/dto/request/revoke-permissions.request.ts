import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RevokePermissionsFromProjectRoleRequest {
  @ApiProperty({
    example: 'uuid-of-role',
    description: 'ID của role trong project',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    example: ['projects.tasks.create'],
    description: 'Danh sách permission codes muốn thu hồi khỏi role',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionCodes: string[];
}
