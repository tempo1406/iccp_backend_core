import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddCommentReactionRequest {
  @ApiProperty({
    example: 'heart',
    description: 'Reaction code, ví dụ: thumbs_up, heart, laugh, fire',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  reaction: string;
}
