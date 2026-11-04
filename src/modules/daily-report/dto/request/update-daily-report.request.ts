import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDailyReportRequest {
  @ApiPropertyOptional({ example: 'Completed backend draft generation and worklog CRUD.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string;

  @ApiPropertyOptional({ example: 'Still waiting for frontend payload contract.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  blockers?: string;

  @ApiPropertyOptional({ example: 'Finalize submit flow and connect manager view.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  planTomorrow?: string;
}
