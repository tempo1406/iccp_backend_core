import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomMessageResponse } from './room-message.response';

export class ListRoomMessagesCursorResponse {
  @ApiProperty({ type: [RoomMessageResponse] })
  items: RoomMessageResponse[];

  @ApiProperty({ example: true })
  hasMore: boolean;

  @ApiPropertyOptional({
    example:
      'eyJzZW50QXQiOiIyMDI2LTAzLTIwVDA2OjE1OjAwLjAwMFoiLCJpZCI6IjFkYjZkYjRlLThjNWMtNDQ2NS1iOWVmLTQ0NTRhNjM3N2Y0YyJ9',
  })
  nextCursor?: string;
}
