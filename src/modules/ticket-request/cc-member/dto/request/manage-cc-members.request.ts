import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class AddCcMembersRequest {
  @ApiProperty({
    type: [String],
    example: [
      '307f0059-51fa-43ea-b1dc-a9629ca1389f',
      '6fdf6ffc-ed77-94fa-407e-a7b86ed9e59d',
    ],
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID(undefined, { each: true })
  memberIds: string[];
}
