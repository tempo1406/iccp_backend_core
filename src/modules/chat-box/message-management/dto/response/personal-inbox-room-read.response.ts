import { ApiProperty } from '@nestjs/swagger';
import { UnreadAggregatesResponse } from './unread-aggregates.response';

export class PersonalInboxRoomReadUpdatedCountsResponse {
  @ApiProperty({ example: 3 })
  mentions: number;

  @ApiProperty({ example: 2 })
  notifications: number;

  @ApiProperty({ example: 5 })
  total: number;
}

export class PersonalInboxRoomReadResponse {
  @ApiProperty({ example: '2258ed87-d67c-4948-90a1-3175c0e0e534' })
  roomId: string;

  @ApiProperty({ example: '25393390-a029-43d0-acfc-fdaeb8cf6a7f' })
  organizationId: string;

  @ApiProperty({ example: true })
  updated: boolean;

  @ApiProperty({ type: PersonalInboxRoomReadUpdatedCountsResponse })
  updatedCounts: PersonalInboxRoomReadUpdatedCountsResponse;

  @ApiProperty({ example: '2026-04-19T08:42:11.231Z' })
  lastReadAt: Date;

  @ApiProperty({ type: UnreadAggregatesResponse })
  afterAggregates: UnreadAggregatesResponse;
}
