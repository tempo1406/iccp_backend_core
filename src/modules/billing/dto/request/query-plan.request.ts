import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationRequest } from '@common/dto/pagination.request';

export const PLAN_SORT_FIELDS = ['name', 'code', 'priceMonthly', 'createdAt'];

export class QueryPlanRequest extends PaginationRequest {
  @ApiPropertyOptional({
    example: 'pro',
    description: 'Tìm kiếm theo tên hoặc mã gói cước',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Lọc theo trạng thái hoạt động',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
