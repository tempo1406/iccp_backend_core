import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationRequest } from '@common/dto/pagination.request';

// Dùng cho Swagger docs và string literal types
export enum RoleSortBy {
  NAME = 'name',
  CREATED_AT = 'createdAt',
}

// Khai báo sẵn danh sách fields được phép sort để helper parse
export const ROLE_SORT_FIELDS = [RoleSortBy.NAME, RoleSortBy.CREATED_AT];

export class GetRolesQueryRequest extends PaginationRequest {
  @ApiPropertyOptional({
    example: 'manager',
    description: 'Tìm kiếm theo tên role (ILIKE)',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
