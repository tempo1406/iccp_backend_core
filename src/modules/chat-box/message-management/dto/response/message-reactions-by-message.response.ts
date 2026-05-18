import { ApiProperty } from '@nestjs/swagger';
import { MessageReactionSummaryResponse } from './message-reaction-summary.response';

export class MessageReactionsByMessageResponse {
  @ApiProperty({ example: '2f4b1046-1280-4e8d-815f-59d51b7ebc2e' })
  messageId: string;

  @ApiProperty({
    type: [MessageReactionSummaryResponse],
    description: 'Reaction summary theo message',
  })
  reactionSummaries: MessageReactionSummaryResponse[];
}
