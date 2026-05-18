import {
  ChatRoomType,
  ChatRoomVisibility,
} from '@modules/chat-box/room-management/entities/room.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomViewerStateResponse } from './room-viewer-state.response';

export class RoomPreviewResponse {
  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  id: string;

  @ApiProperty({ example: 'ebf11c0a-f8ac-4ddf-ad81-9e7c98ea1cd5' })
  organizationId: string;

  @ApiProperty({ enum: ChatRoomType, example: ChatRoomType.CHANNEL })
  roomType: ChatRoomType;

  @ApiProperty({
    enum: ChatRoomVisibility,
    example: ChatRoomVisibility.PUBLIC,
  })
  visibility: ChatRoomVisibility;

  @ApiPropertyOptional({ example: 'product-updates' })
  name?: string;

  @ApiPropertyOptional({ example: 'product-updates' })
  roomKey?: string;

  @ApiPropertyOptional({ example: 'Announcements and launches' })
  topic?: string;

  @ApiPropertyOptional({ example: 'Public product coordination' })
  description?: string;

  @ApiProperty({ example: 42 })
  memberCount: number;

  @ApiPropertyOptional({ example: 'Alice Nguyen' })
  createdByDisplayName?: string;

  @ApiProperty({ example: false })
  isArchived: boolean;

  @ApiProperty({ example: '2026-03-10T05:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-30T08:35:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: RoomViewerStateResponse })
  viewerState: RoomViewerStateResponse;
}

