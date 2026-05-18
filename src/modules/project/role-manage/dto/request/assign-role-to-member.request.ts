import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignRoleToProjectMemberRequest {
  @ApiProperty({
    example: 'uuid-of-user',
    description: 'ID của user (project member) cần gán role',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: 'uuid-of-role',
    description: 'ID của role cần gán cho member',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;
}
