import { ApiProperty } from '@nestjs/swagger';

export class TaskCommentReactionSummaryResponse {
  @ApiProperty({ example: 'thumbs_up' })
  reaction: string;

  @ApiProperty({ example: 3 })
  count: number;

  @ApiProperty({ example: true })
  reactedByMe: boolean;
}
