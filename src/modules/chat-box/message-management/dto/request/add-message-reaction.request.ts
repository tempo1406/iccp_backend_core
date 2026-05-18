import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddMessageReactionRequest {
  @ApiProperty({
    example: '👍',
    description: 'Emoji dùng để thả reaction',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emoji: string;
}
