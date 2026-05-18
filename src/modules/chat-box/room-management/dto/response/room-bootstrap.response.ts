import { ApiProperty } from '@nestjs/swagger';
import { ChatDraftResponse } from '@modules/chat-box/message-management/dto/response/chat-draft.response';
import { ListRoomMessagesCursorResponse } from '@modules/chat-box/message-management/dto/response/list-room-messages-cursor.response';
import { PinnedMessageResponse } from '@modules/chat-box/message-management/dto/response/pinned-message.response';
import { ReadStateResponse } from '@modules/chat-box/message-management/dto/response/read-state.response';
import { RoomDetailResponse } from './room-detail.response';
import { RoomTabsResponse } from './room-tabs.response';

export class RoomBootstrapResponse {
  @ApiProperty({ type: RoomDetailResponse })
  room: RoomDetailResponse;

  @ApiProperty({ type: RoomTabsResponse })
  tabs: RoomTabsResponse;

  @ApiProperty({ type: ListRoomMessagesCursorResponse })
  messages: ListRoomMessagesCursorResponse;

  @ApiProperty({
    type: ChatDraftResponse,
    nullable: true,
    description: 'Current draft in root composer context',
  })
  draft: ChatDraftResponse | null;

  @ApiProperty({
    type: [PinnedMessageResponse],
    description: 'Pinned message snapshot included in bootstrap payload',
  })
  pinnedMessages: PinnedMessageResponse[];

  @ApiProperty({
    type: ReadStateResponse,
    description: 'Current user read-state snapshot for this room',
  })
  readState: ReadStateResponse;
}

