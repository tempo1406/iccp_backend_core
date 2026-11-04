import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import {
  PeriodicReportRecipientGroup,
  PeriodicReportScope,
  PeriodicReportChannel,
} from '../../constants/periodic-report-settings.constant';
import { ReportFrequency } from '@modules/analytics/periodic-report/domain/constants/periodic-report.constant';

export class PeriodicReportScheduleDto {
  @ApiPropertyOptional({ enum: ReportFrequency })
  @IsEnum(ReportFrequency)
  frequency: ReportFrequency;

  @ApiPropertyOptional()
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sendDelayDays: number;

  @ApiPropertyOptional({ example: '08:00' })
  @IsString()
  sendTime: string;

  @ApiPropertyOptional({ enum: PeriodicReportRecipientGroup, isArray: true })
  @IsArray()
  @IsEnum(PeriodicReportRecipientGroup, { each: true })
  recipientGroups: PeriodicReportRecipientGroup[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsEmail({}, { each: true })
  customEmails: string[];

  @ApiPropertyOptional({ enum: PeriodicReportChannel, isArray: true })
  @IsArray()
  @IsEnum(PeriodicReportChannel, { each: true })
  channels: PeriodicReportChannel[];

  @ApiPropertyOptional({ enum: PeriodicReportScope, isArray: true })
  @IsArray()
  @IsEnum(PeriodicReportScope, { each: true })
  scopes: PeriodicReportScope[];
}

export class UpsertOrgSettingsRequest {
  @ApiPropertyOptional({ example: 10000000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  aiTokenLimit?: number;

  // KPI Weights
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  defaultWeightPointCompletion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  defaultWeightOnTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  defaultWeightOtContribution?: number;

  // OT Multipliers
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  otMultiplierWeekday?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  otMultiplierSaturday?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  otMultiplierSunday?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  otMultiplierHoliday?: number;

  // Bonus
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bonusEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bonusOnTimeTask?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  bonusEarlyTaskHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bonusEarlyTask?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bonusZeroOverdue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bonusMaxCap?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bonusOtPerEffectiveHour?: number;

  // Notification
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultReminderChannels?: string[];

  // Digest
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  digestEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  digestDay?: number;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  digestTime?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  digestRecipients?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  digestChannels?: string[];

  // Periodic report (multi-frequency)
  @ApiPropertyOptional({ type: [PeriodicReportScheduleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PeriodicReportScheduleDto)
  periodicReportSchedules?: PeriodicReportScheduleDto[];
}
