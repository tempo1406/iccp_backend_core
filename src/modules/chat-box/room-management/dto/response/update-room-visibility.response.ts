import { ChatRoomVisibility } from '@modules/chat-box/room-management/entities/room.entity';
import { ApiProperty } from '@nestjs/swagger';

class UpdateRoomVisibilitySnapshotResponse {
  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  id: string;

  @ApiProperty({
    enum: ChatRoomVisibility,
    example: ChatRoomVisibility.PRIVATE,
  })
  visibility: ChatRoomVisibility;

  @ApiProperty({ example: '2026-03-30T08:35:00.000Z' })
  updatedAt: Date;
}

export class UpdateRoomVisibilityResponse {
  @ApiProperty({ example: 'ee57ff89-a83f-4e1d-ab5a-b0243c88f19d' })
  roomId: string;

  @ApiProperty({ example: '447db699-827e-4cd9-9020-2438aa6882a9' })
  actorUserId: string;

  @ApiProperty({
    enum: ChatRoomVisibility,
    example: ChatRoomVisibility.PUBLIC,
  })
  previousVisibility: ChatRoomVisibility;

  @ApiProperty({
    enum: ChatRoomVisibility,
    example: ChatRoomVisibility.PRIVATE,
  })
  currentVisibility: ChatRoomVisibility;

  @ApiProperty({ example: true })
  updated: boolean;

  @ApiProperty({ example: '2026-03-30T08:35:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: UpdateRoomVisibilitySnapshotResponse })
  room: UpdateRoomVisibilitySnapshotResponse;
}

