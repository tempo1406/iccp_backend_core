import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({ description: 'Tổng số bản ghi', example: 100 })
  total: number;

  @ApiProperty({ description: 'Trang hiện tại', example: 1 })
  page: number;

  @ApiProperty({ description: 'Số bản ghi mỗi trang', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Tổng số trang', example: 10 })
  totalPages: number;

  @ApiProperty({ description: 'Có trang tiếp theo không', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Có trang trước không', example: false })
  hasPreviousPage: boolean;
}

export class PaginatedResponse<T> {
  @ApiProperty({ description: 'Danh sách dữ liệu', isArray: true })
  data: T[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  constructor(data: T[], meta: PaginationMeta) {
    this.data = data;
    this.meta = meta;
  }
}
