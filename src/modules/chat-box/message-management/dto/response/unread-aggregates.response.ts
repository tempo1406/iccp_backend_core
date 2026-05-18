import { ApiProperty } from '@nestjs/swagger';

export class UnreadAggregatesResponse {
  @ApiProperty({
    example: 12,
    description: 'Tong unread message theo room read-state',
  })
  roomUnreadMessageCount: number;

  @ApiProperty({
    example: 5,
    description: 'So room co unreadCount > 0 trong My Inbox > Unread (v1)',
  })
  myInboxUnreadItemCount: number;

  @ApiProperty({
    example: 12,
    description: 'Tong unread message cua My Inbox > Unread (v1)',
  })
  myInboxUnreadMessageCount: number;

  @ApiProperty({
    example: 3,
    description: 'So unread item cua notifications feed',
  })
  notificationUnreadCount: number;
}

