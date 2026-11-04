import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum DashboardMemberRange {
  TODAY = 'today',
  LAST_WEEK = 'last_week',
  LAST_MONTH = 'last_month',
}

export class GetDashboardOverviewQueryDto {
  @ApiPropertyOptional({
    description: 'Quarter filter year for org admin viewers',
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(3000)
  adminYear?: number;

  @ApiPropertyOptional({
    description: 'Quarter filter value for org admin viewers',
    example: 2,
    minimum: 1,
    maximum: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  adminQuarter?: number;

  @ApiPropertyOptional({
    description: 'Relative time filter for member viewers',
    enum: DashboardMemberRange,
    example: DashboardMemberRange.LAST_WEEK,
  })
  @IsOptional()
  @IsEnum(DashboardMemberRange)
  memberRange?: DashboardMemberRange;
}
