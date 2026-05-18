import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RemoveMessageReactionQueryRequest {
  @ApiProperty({
    example: '👍',
    description: 'Emoji reaction cần xóa của tôi',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emoji: string;
}
