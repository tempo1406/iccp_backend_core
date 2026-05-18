import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PointScaleType {
  FIBONACCI = 'fibonacci',
  LINEAR = 'linear',
  CUSTOM = 'custom',
}

export class UpsertProjectSettingsRequest {
  // Daily Report Reminder
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  dailyEnabled?: boolean;

  @ApiPropertyOptional({ example: '09:00', description: 'Reminder time in VN timezone (HH:mm)' })
  @IsOptional() @IsString()
  dailyTime?: string;

  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @IsInt({ each: true })
  @Min(1, { each: true }) @Max(7, { each: true })
  dailyDays?: number[];

  // Reminder
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  taskDueReminderEnabled?: boolean;

  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true })
  taskDueReminderHours?: number[];

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true })
  reminderChannels?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  overdueEscalationEnabled?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  overdueEscalationAfterHours?: number;

  // Point Scale
  @ApiPropertyOptional({ enum: PointScaleType }) @IsOptional() @IsEnum(PointScaleType)
  pointScaleType?: PointScaleType;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true })
  @ValidateIf((o) => o.pointScaleType === PointScaleType.CUSTOM)
  pointScaleValues?: number[];

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  maxPointPerTask?: number;

  // KPI Weights
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1)
  @Type(() => Number)
  kpiWeightPointCompletion?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1)
  @Type(() => Number)
  kpiWeightOnTime?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1)
  @Type(() => Number)
  kpiWeightOtContribution?: number;

  // Bonus
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  bonusEnabled?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  bonusOnTimeTask?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  bonusEarlyTaskHours?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  bonusEarlyTask?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  bonusZeroOverdue?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  bonusMaxCap?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  bonusOtPerEffectiveHour?: number;
}
