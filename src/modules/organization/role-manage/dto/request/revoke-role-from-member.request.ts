import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class RevokeRoleFromMemberRequest {
  @ApiProperty({
    example: 'uuid-of-user',
    description: 'ID của user cần thu hồi role',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: 'uuid-of-role',
    description: 'ID của role cần thu hồi khỏi user',
  })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;
}
