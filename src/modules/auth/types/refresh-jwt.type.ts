import { IsNotEmpty } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshJwtDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'refresh_token',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
