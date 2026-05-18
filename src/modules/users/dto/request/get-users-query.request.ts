import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationRequest } from '@common/dto/pagination.request';

export enum UserSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  EMAIL = 'email',
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
}

export const USER_SORT_FIELDS = [
  UserSortBy.CREATED_AT,
  UserSortBy.UPDATED_AT,
  UserSortBy.EMAIL,
  UserSortBy.FIRST_NAME,
  UserSortBy.LAST_NAME,
];

export class GetUsersQueryRequest extends PaginationRequest {
  @ApiPropertyOptional({
    example: 'john',
    description: 'Tìm kiếm theo email, firstName, lastName (ILIKE)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Lọc theo trạng thái active/inactive',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Lọc theo trạng thái verified/unverified',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    example: 'local',
    description: 'Lọc theo provider (local/google/microsoft)',
  })
  @IsOptional()
  @IsString()
  provider?: string;
}
