import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { SubscriptionStatus } from '../../entities/subscription.entity';

@Exclude()
export class SubscriptionResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  organizationId: string;

  @ApiPropertyOptional({ example: 'ICCP Organization' })
  @Expose()
  organizationName?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  planId: string;

  @ApiPropertyOptional({ example: 'Standard' })
  @Expose()
  planName?: string;

  @ApiPropertyOptional({ example: 'standard' })
  @Expose()
  planCode?: string;

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

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @Expose()
  createdAt: Date;
}
