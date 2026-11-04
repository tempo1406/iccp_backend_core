import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptJoinRequest {
  @ApiProperty({
    description: 'Token của lời mời',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
