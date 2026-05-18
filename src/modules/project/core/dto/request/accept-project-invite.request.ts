import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptProjectInviteRequest {
  @ApiProperty({
    description: 'Token lời mời project nhận qua email',
    example: '7f2cf67f9d40475a8f40d8db5ec8df2f2aab2b3c0de45b6a3d8b8b9f6d0c6a11',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
