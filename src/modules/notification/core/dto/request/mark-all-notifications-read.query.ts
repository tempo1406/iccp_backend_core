import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class MarkAllNotificationsReadQuery {
  @ApiPropertyOptional({
    description:
      'Filter notifications by organizationId inside notification.data.',
    example: '25393390-a029-43d0-acfc-fdaeb8cf6a7f',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    description:
      'Filter notifications by roomId inside notification.data. Primarily used for chat-box notifications.',
    example: '47e7a79a-20b7-4a4f-bfe2-122eaa8fee78',
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;
}
