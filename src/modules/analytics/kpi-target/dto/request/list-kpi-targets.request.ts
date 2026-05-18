import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import {
  KpiTargetPeriod,
  KpiTargetScopeType,
  KpiTargetStatus,
} from '../../enums/kpi-target.enum';

export class ListKpiTargetsRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional({ enum: KpiTargetScopeType })
  @IsOptional()
  @IsEnum(KpiTargetScopeType)
  scopeType?: KpiTargetScopeType;

  @ApiPropertyOptional({ enum: KpiTargetPeriod })
  @IsOptional()
  @IsEnum(KpiTargetPeriod)
  period?: KpiTargetPeriod;

  @ApiPropertyOptional({ enum: KpiTargetStatus })
  @IsOptional()
  @IsEnum(KpiTargetStatus)
  status?: KpiTargetStatus;

  @ApiPropertyOptional({
    description: 'Chỉ lấy target có kỳ chứa ngày này',
    example: '2026-04-15',
  })
  @IsOptional()
  @IsDateString()
  activeOn?: string;
}
