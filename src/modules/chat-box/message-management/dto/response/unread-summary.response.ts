import { ApiProperty } from '@nestjs/swagger';
import { UnreadAggregatesResponse } from './unread-aggregates.response';
import { UnreadCountResponse } from './unread-count.response';

export class UnreadSummaryResponse {
  @ApiProperty({ example: 12 })
  totalUnread: number;

  @ApiProperty({ type: [UnreadCountResponse] })
  rooms: UnreadCountResponse[];

  @ApiProperty({ type: UnreadAggregatesResponse })
  aggregates: UnreadAggregatesResponse;
}
