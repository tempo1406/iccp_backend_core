import { ApiProperty } from '@nestjs/swagger';
import { MessagePinStateResponse } from './message-pin-state.response';

export class UpdateMessagePinResponse {
  @ApiProperty({
    enum: ['pinned', 'unpinned'],
    example: 'pinned',
  })
  action: 'pinned' | 'unpinned';

  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  roomId: string;

  @ApiProperty({ example: '2f4b1046-1280-4e8d-815f-59d51b7ebc2e' })
  messageId: string;

  @ApiProperty({
    example: true,
    description:
      'true when this request changes pin state, false for idempotent no-op',
  })
  updated: boolean;

  @ApiProperty({
    example: true,
    description: 'Backward-compatible alias for action state',
  })
  isPinned: boolean;

  @ApiProperty({
    example: 128,
    description: 'Monotonic pin version scoped by room',
  })
  roomPinVersion: number;

  @ApiProperty({
    example: 4,
    description: 'Current active pinned message count in room',
  })
  pinnedCount: number;

  @ApiProperty({
    type: MessagePinStateResponse,
    nullable: true,
    description: 'Pin snapshot when action is pinned, null when unpinned',
  })
  pin: MessagePinStateResponse | null;
}
