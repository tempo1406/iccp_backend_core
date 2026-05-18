import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationRequest } from '@common/dto/pagination.request';

export enum MemberSortBy {
  JOINED_AT = 'joinedAt',
  EMAIL = 'email',
  FIRST_NAME = 'firstName',
}

export const MEMBER_SORT_FIELDS = [
  MemberSortBy.JOINED_AT,
  MemberSortBy.EMAIL,
  MemberSortBy.FIRST_NAME,
];

export class GetMembersQueryRequest extends PaginationRequest {
  @ApiPropertyOptional({
    example: 'john',
    description: 'Tìm kiếm theo email, firstName, lastName (ILIKE)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Lọc theo trạng thái active/inactive của member',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @IsBoolean()
  isActive?: boolean;
}
