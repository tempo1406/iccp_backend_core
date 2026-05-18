import { PaginationRequest } from '@common/dto/pagination.request';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DailyReportStatus } from '../../entities/daily-report.entity';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum DailyReportSortBy {
  REPORT_DATE = 'reportDate',
  CREATED_AT = 'createdAt',
  SUBMITTED_AT = 'submittedAt',
  TOTAL_LOGGED_MINUTES = 'totalLoggedMinutes',
}

export const DAILY_REPORT_SORT_FIELDS = [
  DailyReportSortBy.REPORT_DATE,
  DailyReportSortBy.CREATED_AT,
  DailyReportSortBy.SUBMITTED_AT,
  DailyReportSortBy.TOTAL_LOGGED_MINUTES,
];

export class QueryProjectDailyReportsRequest extends PaginationRequest {
  @ApiPropertyOptional({
    example: '2026-04-18',
    description: 'Defaults to organization current date',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  date?: string;

  @ApiPropertyOptional({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    enum: DailyReportStatus,
    description: 'Filter by report status',
  })
  @IsOptional()
  @IsEnum(DailyReportStatus)
  status?: DailyReportStatus;

  @ApiPropertyOptional({
    example: 'nguyen',
    description:
      'Search by user display name, email, summary, blockers, or planTomorrow',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
