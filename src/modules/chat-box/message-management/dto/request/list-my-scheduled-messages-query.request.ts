import { ChatScheduledMessageStatus } from '@modules/chat-box/message-management/entities/scheduled-message.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListMyScheduledMessagesQueryRequest {
  @ApiPropertyOptional({
    description: 'Page size for scheduled list',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Cursor from previous response for next page',
    example:
      'eyJzY2hlZHVsZWRGb3JVdGMiOiIyMDI2LTAzLTI0VDAyOjAwOjAwLjAwMFoiLCJpZCI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCJ9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    enum: ChatScheduledMessageStatus,
    description: 'Filter by scheduled message status',
    default: ChatScheduledMessageStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ChatScheduledMessageStatus)
  status?: ChatScheduledMessageStatus = ChatScheduledMessageStatus.PENDING;
}
