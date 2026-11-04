import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTicketCommentRequest {
  @ApiProperty({ example: 'Da cap nhat thong tin ban giao cong viec.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
