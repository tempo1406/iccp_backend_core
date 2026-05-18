import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetRoomMessageContextQueryRequest {
  @ApiPropertyOptional({
    description: 'Number of messages before target message',
    default: 20,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  before?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of messages after target message',
    default: 20,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  after?: number = 20;
}
