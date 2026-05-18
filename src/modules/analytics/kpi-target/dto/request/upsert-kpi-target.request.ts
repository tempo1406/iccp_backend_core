import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  KpiTargetPeriod,
  KpiTargetScopeType,
  KpiTargetStatus,
} from '../../enums/kpi-target.enum';

export class UpsertKpiTargetRequest {
  @ApiProperty({ enum: KpiTargetScopeType })
  @IsEnum(KpiTargetScopeType)
  scopeType: KpiTargetScopeType;

  @ApiPropertyOptional({
    type: [String],
    description: 'Users duoc gan target khi scopeType = USER',
  })
  @ValidateIf((o) => o.scopeType === KpiTargetScopeType.USER || !!o.userIds)
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Roles duoc gan target khi scopeType = ROLE | PROJECT_ROLE',
  })
  @ValidateIf((o) => o.scopeType !== KpiTargetScopeType.USER || !!o.roleIds)
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({
    description: 'Project ID. Bat buoc voi PROJECT_ROLE, optional voi USER',
  })
  @IsOptional()
  @IsUUID('4')
  projectId?: string | null;

  @ApiProperty({ enum: KpiTargetPeriod })
  @IsEnum(KpiTargetPeriod)
  period: KpiTargetPeriod;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-04-30' })
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional({ description: 'Muc tieu performance score (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  targetScore?: number;

  @ApiPropertyOptional({ description: '% hoan thanh point (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  targetPointCompletionRate?: number;

  @ApiPropertyOptional({ description: '% task on-time (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  targetOnTimeRate?: number;

  @ApiPropertyOptional({ description: 'So gio OT mong doi' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  targetOtHours?: number;

  @ApiPropertyOptional({ description: 'So task can hoan thanh' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  targetCompletedTasks?: number;

  @ApiPropertyOptional({ description: 'So task overdue toi da cho phep' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxOverdueTasks?: number;

  @ApiPropertyOptional({ description: 'Bat buoc khong co task overdue' })
  @IsOptional()
  @IsBoolean()
  requireZeroOverdue?: boolean;

  @ApiPropertyOptional({ enum: KpiTargetStatus })
  @IsOptional()
  @IsEnum(KpiTargetStatus)
  status?: KpiTargetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateKpiTargetRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  targetScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  targetPointCompletionRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  targetOnTimeRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  targetOtHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  targetCompletedTasks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxOverdueTasks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireZeroOverdue?: boolean;

  @ApiPropertyOptional({ enum: KpiTargetStatus })
  @IsOptional()
  @IsEnum(KpiTargetStatus)
  status?: KpiTargetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CloneKpiTargetRequest {
  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  fromPeriodStart: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  toPeriodStart: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}
