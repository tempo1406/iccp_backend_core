import { ApiProperty } from '@nestjs/swagger';
import { RoomMessageResponse } from './room-message.response';

export class PinnedMessageResponse {
  @ApiProperty({ example: '82cae08a-2c7f-410d-b860-0f5f534996b2' })
  id: string;

  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  roomId: string;

  @ApiProperty({ example: '2f4b1046-1280-4e8d-815f-59d51b7ebc2e' })
  messageId: string;

  @ApiProperty({ example: '6e882f55-74d2-4f5f-b1df-7862908bd465' })
  pinnedBy: string;

  @ApiProperty({ example: '2026-03-11T05:20:00.000Z' })
  pinnedAt: Date;

  @ApiProperty({ type: RoomMessageResponse })
  message: RoomMessageResponse;
}
