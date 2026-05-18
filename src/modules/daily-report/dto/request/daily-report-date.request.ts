import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DailyReportDateRequest {
  @ApiPropertyOptional({ example: '2026-04-18', description: 'Defaults to organization current date' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  date?: string;
}
