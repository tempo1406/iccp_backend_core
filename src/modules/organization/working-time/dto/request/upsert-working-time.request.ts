import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertWorkingTimeRequest {
  @ApiPropertyOptional({ minimum: 0, maximum: 24 })
  @IsOptional() @IsNumber() @Min(0) @Max(24) @Type(() => Number)
  mondayHours?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 24 })
  @IsOptional() @IsNumber() @Min(0) @Max(24) @Type(() => Number)
  tuesdayHours?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 24 })
  @IsOptional() @IsNumber() @Min(0) @Max(24) @Type(() => Number)
  wednesdayHours?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 24 })
  @IsOptional() @IsNumber() @Min(0) @Max(24) @Type(() => Number)
  thursdayHours?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 24 })
  @IsOptional() @IsNumber() @Min(0) @Max(24) @Type(() => Number)
  fridayHours?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 24 })
  @IsOptional() @IsNumber() @Min(0) @Max(24) @Type(() => Number)
  saturdayHours?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 24 })
  @IsOptional() @IsNumber() @Min(0) @Max(24) @Type(() => Number)
  sundayHours?: number;
}
