import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduledMessageResponse } from './scheduled-message.response';

export class ScheduledMessageListResponse {
  @ApiProperty({ type: [ScheduledMessageResponse] })
  items: ScheduledMessageResponse[];

  @ApiPropertyOptional({
    description: 'Cursor for loading the next page',
  })
  nextCursor?: string;
}
