import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

const toBoolean = (value: unknown): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class GetRoomBootstrapQueryRequest {
  @ApiPropertyOptional({
    description:
      'Default false for lightweight room bootstrap. Set true when FE needs full members list immediately.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeMembers?: boolean = false;

  @ApiPropertyOptional({
    description: 'First message page size for room bootstrap',
    default: 30,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  messageLimit?: number = 30;

  @ApiPropertyOptional({
    description: 'Pinned message list size included in room bootstrap',
    default: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  pinnedLimit?: number = 5;
}

