import { ApiProperty } from '@nestjs/swagger';

export class RoomTabsItemResponse {
  @ApiProperty({ example: 'messages' })
  id: string;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({ example: false })
  hidden: boolean;
}

export class RoomTabsResponse {
  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  roomId: string;

  @ApiProperty({ example: 'room' })
  scope: 'room';

  @ApiProperty({ type: [RoomTabsItemResponse] })
  tabs: RoomTabsItemResponse[];

  @ApiProperty({ example: false })
  updated: boolean;

  @ApiProperty({ example: '2026-03-20T09:30:00.000Z' })
  updatedAt: Date;
}
