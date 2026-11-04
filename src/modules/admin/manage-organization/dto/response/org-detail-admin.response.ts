import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrgListItemResponse } from './org-list-item.response';

export class OrgDetailAdminResponse extends OrgListItemResponse {
  // ------- Extended org info -------
  @ApiPropertyOptional({ description: 'Mô tả tổ chức' })
  description?: string;

  @ApiPropertyOptional({ description: 'Cài đặt tuỳ chỉnh (JSON)' })
  settings?: Record<string, any>;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Ngày cập nhật gần nhất',
  })
  updatedAt: Date;

  // ------- Owner full info -------
  @ApiPropertyOptional({
    example: 'Nguyen',
    description: 'Họ của owner',
  })
  ownerFirstName?: string;

  @ApiPropertyOptional({
    example: 'Van A',
    description: 'Tên của owner',
  })
  ownerLastName?: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'SĐT owner' })
  ownerPhone?: string;

  // ------- Full plan details -------
  @ApiPropertyOptional({
    example: 99.99,
    description: 'Giá gói theo tháng (USD)',
  })
  planPriceMonthly?: number;

  @ApiPropertyOptional({
    example: 999.99,
    description: 'Giá gói theo năm (USD)',
  })
  planPriceYearly?: number;

  @ApiPropertyOptional({
    example: 50,
    description: 'Số user tối đa của gói (null = không giới hạn)',
  })
  planMaxUsers?: number;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Số document tối đa của gói',
  })
  planMaxDocuments?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Dung lượng lưu trữ tối đa (GB)',
  })
  planMaxStorageGb?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Số project tối đa của gói',
  })
  planMaxProjects?: number;

  @ApiPropertyOptional({
    description: 'Danh sách tính năng của gói (JSON)',
  })
  planFeatures?: any;

  @ApiPropertyOptional({
    example: '2025-06-01T00:00:00.000Z',
    description: 'Ngày hết hạn trial (nếu đang trong giai đoạn trial)',
  })
  trialEndsAt?: Date;
}
