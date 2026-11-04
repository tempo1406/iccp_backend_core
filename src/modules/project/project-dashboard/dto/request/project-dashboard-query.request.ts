import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ProjectDashboardQueryRequest {
  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter tasks created from this date (ISO date string)',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2024-01-31',
    description: 'Filter tasks created up to this date (ISO date string)',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
