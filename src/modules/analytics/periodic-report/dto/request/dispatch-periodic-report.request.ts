import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class DispatchPeriodicReportRequest {
  @ApiProperty({ example: '2026-Q1', description: 'YYYY-QN | YYYY-MNN | YYYY-Y' })
  @IsString()
  @Matches(/^(?:\d{4}-Q[1-4]|\d{4}-M(?:0[1-9]|1[0-2])|\d{4}-Y)$/)
  periodKey: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  forceResend?: boolean = false;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  forceRebuild?: boolean = false;
}
