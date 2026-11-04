import { ApiProperty } from '@nestjs/swagger';
import { RoomMessageResponse } from './room-message.response';
import { ScheduledMessageResponse } from './scheduled-message.response';

export class ScheduledMessageSendNowResponse {
  @ApiProperty({ type: ScheduledMessageResponse })
  scheduledMessage: ScheduledMessageResponse;

  @ApiProperty({ type: RoomMessageResponse })
  sentMessage: RoomMessageResponse;
}
