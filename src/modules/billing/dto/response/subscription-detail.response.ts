import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { SubscriptionStatus } from '../../entities/subscription.entity';

@Exclude()
class PlanDetailDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Standard' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'standard' })
  @Expose()
  code: string;

  @ApiPropertyOptional({ example: 'Gói cước tiêu chuẩn' })
  @Expose()
  description?: string;

  @ApiProperty({ example: 790000 })
  @Expose()
  priceMonthly: number;

  @ApiProperty({ example: 7900000 })
  @Expose()
  priceYearly: number;

  @ApiPropertyOptional({ example: 20 })
  @Expose()
  maxUsers?: number;

  @ApiPropertyOptional({ example: 500 })
  @Expose()
  maxDocuments?: number;

  @ApiPropertyOptional({ example: 50 })
  @Expose()
  maxStorageGb?: number;

  @ApiPropertyOptional({ example: 20 })
  @Expose()
  maxProjects?: number;

  @ApiPropertyOptional({ example: { chat: true, priority_support: true } })
  @Expose()
  features?: any;
}

@Exclude()
class OrgDetailDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'ICCP Organization' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ example: 'iccp-organization' })
  @Expose()
  slug?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @Expose()
  logoUrl?: string;
}

@Exclude()
export class SubscriptionDetailResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  organizationId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  planId: string;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  @Expose()
  status: SubscriptionStatus;

  @ApiPropertyOptional({ example: 'yearly' })
  @Expose()
  billingCycle?: string;

  @ApiPropertyOptional({ example: '2025-01-01', nullable: true })
  @Expose()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2026-01-01', nullable: true })
  @Expose()
  endDate?: Date;

  @ApiPropertyOptional({ example: '2025-02-01T00:00:00.000Z' })
  @Expose()
  trialEndsAt?: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @Expose()
  updatedAt: Date;

  @ApiProperty({ type: PlanDetailDto })
  @Expose()
  @Type(() => PlanDetailDto)
  plan: PlanDetailDto;

  @ApiProperty({ type: OrgDetailDto })
  @Expose()
  @Type(() => OrgDetailDto)
  organization: OrgDetailDto;
}
