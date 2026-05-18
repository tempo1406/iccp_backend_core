import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignRoleToMemberRequest {
  @ApiProperty({
    example: 'uuid-of-user',
    description: 'ID của user cần gán role',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: 'uuid-of-role',
    description: 'ID của role cần gán cho user',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;
}
