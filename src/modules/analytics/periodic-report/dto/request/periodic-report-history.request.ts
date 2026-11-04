import { PaginationRequest } from '@common/dto/pagination.request';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  PeriodicReportRunStatus,
  ReportFrequency,
} from '../../domain/constants/periodic-report.constant';

export class PeriodicReportHistoryRequest extends PaginationRequest {
  @ApiPropertyOptional({ example: '2026-Q1' })
  @IsOptional()
  @IsString()
  periodKey?: string;

  @ApiPropertyOptional({ enum: PeriodicReportRunStatus })
  @IsOptional()
  @IsEnum(PeriodicReportRunStatus)
  status?: PeriodicReportRunStatus;

  @ApiPropertyOptional({ enum: ReportFrequency })
  @IsOptional()
  @IsEnum(ReportFrequency)
  frequency?: ReportFrequency;
}
