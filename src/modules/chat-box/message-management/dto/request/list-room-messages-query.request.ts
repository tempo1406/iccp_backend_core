import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListRoomMessagesQueryRequest {
  @ApiPropertyOptional({
    description: 'Giới hạn số lượng message',
    default: 30,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 30;

  @ApiPropertyOptional({
    description: 'Lấy message trước thời điểm này',
    example: '2026-03-10T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  beforeSentAt?: string;
}
