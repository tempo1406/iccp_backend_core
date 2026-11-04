import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatDraftResponse } from './chat-draft.response';

export class ChatDraftListResponse {
  @ApiProperty({ type: [ChatDraftResponse] })
  items: ChatDraftResponse[];

  @ApiPropertyOptional({
    description: 'Cursor for loading the next page',
  })
  nextCursor?: string;
}
