import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddTaskTagRequest {
  @ApiProperty({ example: 'Backend' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}
