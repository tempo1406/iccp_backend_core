import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SortOrder } from '@common/dto/pagination.request';

export enum OrgKpiMemberSortBy {
  PERFORMANCE_SCORE = 'performanceScore',
  COMPLETION_RATE = 'completionRate',
  ON_TIME_RATE = 'onTimeRate',
  TOTAL_ASSIGNED = 'totalAssigned',
  PROJECT_COUNT = 'projectCount',
  POINT_COMPLETION = 'pointCompletionRate',
  OT_HOURS = 'totalOtHours',
}

export class OrgKpiMembersQueryRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: OrgKpiMemberSortBy })
  @IsOptional()
  @IsEnum(OrgKpiMemberSortBy)
  sortBy?: OrgKpiMemberSortBy = OrgKpiMemberSortBy.PERFORMANCE_SCORE;

  @ApiPropertyOptional({ enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
