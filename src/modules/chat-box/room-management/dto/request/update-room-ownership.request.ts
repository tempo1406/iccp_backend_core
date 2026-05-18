import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateRoomOwnershipRequest {
  @ApiProperty({
    format: 'uuid',
    description: 'User ID se duoc transfer thanh owner moi',
    example: '8eb14979-fdf1-48fb-8eb8-8cf2015dc8de',
  })
  @IsUUID()
  newOwnerUserId: string;
}

