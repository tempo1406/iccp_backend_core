import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationRequest } from '@common/dto/pagination.request';
import { SubscriptionStatus } from '../../entities/subscription.entity';

export const SUBSCRIPTION_SORT_FIELDS = [
  'createdAt',
  'startDate',
  'endDate',
  'status',
];

export class QuerySubscriptionRequest extends PaginationRequest {
  @ApiPropertyOptional({
    example: 'ICCP',
    description: 'Tìm kiếm theo tên tổ chức',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: SubscriptionStatus,
    description: 'Lọc theo trạng thái subscription',
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Lọc theo plan ID',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
