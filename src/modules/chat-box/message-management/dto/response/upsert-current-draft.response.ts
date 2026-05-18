import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatDraftResponse } from './chat-draft.response';

export class UpsertCurrentDraftResponse {
  @ApiProperty({ example: true })
  updated: boolean;

  @ApiProperty({ example: false })
  draftDeleted: boolean;

  @ApiPropertyOptional({ type: ChatDraftResponse })
  draft?: ChatDraftResponse;
}
