import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrgHolidayType } from '../../entities/org-holiday.entity';

export class CreateHolidayRequest {
  @ApiProperty({ example: '2026-09-02' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'National Day' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: OrgHolidayType })
  @IsOptional()
  @IsEnum(OrgHolidayType)
  type?: OrgHolidayType;

  @ApiPropertyOptional({ description: '0 = full day off, 4 = half day', minimum: 0, maximum: 24 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  @Type(() => Number)
  workingHours?: number;
}
