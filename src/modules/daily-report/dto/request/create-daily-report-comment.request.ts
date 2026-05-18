import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateDailyReportCommentRequest {
  @ApiProperty({
    example: 'Please clarify blocker number 2 and share the expected fix plan.',
  })
  @IsString()
  @MaxLength(2000)
  content: string;
}
