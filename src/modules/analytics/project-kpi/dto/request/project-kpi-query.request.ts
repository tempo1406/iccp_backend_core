import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SortOrder } from '@common/dto/pagination.request';

export enum KpiMemberSortBy {
  PERFORMANCE_SCORE = 'performanceScore',
  COMPLETION_RATE = 'completionRate',
  ON_TIME_RATE = 'onTimeRate',
  TOTAL_ASSIGNED = 'totalAssigned',
  POINT_COMPLETION = 'pointCompletionRate',
}

export class ProjectKpiMembersQueryRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: KpiMemberSortBy })
  @IsOptional()
  @IsEnum(KpiMemberSortBy)
  sortBy?: KpiMemberSortBy = KpiMemberSortBy.PERFORMANCE_SCORE;

  @ApiPropertyOptional({ enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
