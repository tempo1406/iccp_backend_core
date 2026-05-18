import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationRequest } from '@common/dto/pagination.request';

export enum SystemRoleSortBy {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export const SYSTEM_ROLE_SORT_FIELDS = [
  SystemRoleSortBy.NAME,
  SystemRoleSortBy.CREATED_AT,
  SystemRoleSortBy.UPDATED_AT,
];

export class GetSystemRolesQueryRequest extends PaginationRequest {
  @ApiPropertyOptional({
    example: 'reviewer',
    description: 'Search by role name or description (ILIKE)',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
