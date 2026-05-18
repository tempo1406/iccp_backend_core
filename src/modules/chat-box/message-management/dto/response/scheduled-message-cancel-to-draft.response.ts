import { ApiProperty } from '@nestjs/swagger';
import { ChatDraftResponse } from './chat-draft.response';
import { ScheduledMessageResponse } from './scheduled-message.response';

export class ScheduledMessageCancelToDraftResponse {
  @ApiProperty({ type: ScheduledMessageResponse })
  scheduledMessage: ScheduledMessageResponse;

  @ApiProperty({ type: ChatDraftResponse })
  draft: ChatDraftResponse;
}
