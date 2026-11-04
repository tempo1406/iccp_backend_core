import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginationRequest } from '@common/dto/pagination.request';
import { PaginationMeta } from '@common/dto/paginated.response';

export class PaginationHelper {
  /**
   * Tính skip + take từ page/limit
   */
  static getSkipAndTake(query: PaginationRequest): {
    skip: number;
    take: number;
  } {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  /**
   * Trả về object order cho TypeORM find()
   * allowedSortFields: whitelist tránh SQL injection qua sortBy
   * Nếu sortBy không nằm trong whitelist → fallback về 'createdAt'
   */
  static getOrder(
    query: PaginationRequest,
    allowedSortFields: string[],
    alias?: string,
  ): Record<string, 'ASC' | 'DESC'> {
    const sortBy = allowedSortFields.includes(query.sortBy ?? '')
      ? (query.sortBy ?? 'createdAt')
      : 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';
    const field = alias ? `${alias}.${sortBy}` : sortBy;
    return { [field]: sortOrder };
  }

  /**
   * Apply pagination + sort vào QueryBuilder
   * Trả về chính QueryBuilder (fluent)
   */
  static applyToQueryBuilder<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    query: PaginationRequest,
    allowedSortFields: string[],
    alias: string,
  ): SelectQueryBuilder<T> {
    const { skip, take } = this.getSkipAndTake(query);
    const sortBy = allowedSortFields.includes(query.sortBy ?? '')
      ? (query.sortBy ?? 'createdAt')
      : 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';

    return qb.orderBy(`${alias}.${sortBy}`, sortOrder).skip(skip).take(take);
  }

  /**
   * Build PaginationMeta từ total + query
   */
  static buildMeta(total: number, query: PaginationRequest): PaginationMeta {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const totalPages = Math.ceil(total / limit);

    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
