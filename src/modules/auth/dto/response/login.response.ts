import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginResponse {
  @ApiProperty({ example: 'access_token' })
  @IsString()
  accessToken: string;

  @ApiProperty({ example: 'refresh_token' })
  @IsString()
  refreshToken: string;
}
