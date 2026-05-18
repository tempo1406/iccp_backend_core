import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenResponse {
  @ApiProperty({ example: 'new access_token' })
  @IsString()
  accessToken: string;

  @ApiProperty({ example: 'new refresh_token' })
  @IsString()
  refreshToken: string;
}
