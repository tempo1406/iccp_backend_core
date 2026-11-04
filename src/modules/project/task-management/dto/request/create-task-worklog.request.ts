import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskWorklogRequest {
  @ApiProperty({
    example: '2026-04-18',
    description: 'Work date in YYYY-MM-DD format',
  })
  @IsString()
  @MaxLength(10)
  workDate: string;

  @ApiPropertyOptional({ example: '2026-04-18T01:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startedAt?: Date;

  @ApiPropertyOptional({ example: '2026-04-18T02:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  endedAt?: Date;

  @ApiPropertyOptional({
    example: 90,
    description: 'Required when startedAt and endedAt are not both provided',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'Implemented daily report draft generation' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBlocker?: boolean;

  @ApiPropertyOptional({
    example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60',
    description:
      'Only users with log-time permission can log on behalf of the assigned member',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
