import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SubscriptionPlanResponse {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID của gói cước',
  })
  @Expose()
  id: string;

  @ApiProperty({
    example: 'Gói cước 1',
    description: 'Tên của gói cước',
  })
  @Expose()
  name: string;

  @ApiProperty({
    example: 'GÓI_CƯỚC_1',
    description: 'Mã của gói cước',
  })
  @Expose()
  code: string;

  @ApiProperty({
    example: 'Gói cước 1 là gói cước 1',
    description: 'Mô tả của gói cước',
  })
  @Expose()
  description: string;

  @ApiProperty({
    example: 100000,
    description: 'Giá của gói cước hàng tháng',
  })
  @Expose()
  priceMonthly: number;

  @ApiProperty({
    example: 1000000,
    description: 'Giá của gói cước hàng năm',
  })
  @Expose()
  priceYearly: number;

  @ApiProperty({
    example: 10,
    description: 'Số lượng người dùng tối đa của gói cước',
  })
  @Expose()
  maxUsers: number;

  @ApiProperty({
    example: 100,
    description: 'Số lượng tài liệu tối đa của gói cước',
  })
  @Expose()
  maxDocuments: number;

  @ApiProperty({
    example: 100,
    description: 'Số lượng lưu trữ tối đa của gói cước',
  })
  @Expose()
  maxStorageGb: number;

  @ApiProperty({
    example: 10,
    description: 'Số lượng dự án tối đa của gói cước',
  })
  @Expose()
  maxProjects: number;

  @ApiProperty({
    example: ['Tính năng 1', 'Tính năng 2', 'Tính năng 3'],
    description: 'Tính năng của gói cước',
  })
  @Expose()
  features: any;

  @ApiProperty({
    example: 14,
    description: 'Số ngày dùng thử miễn phí (0 = không có trial)',
  })
  @Expose()
  trialDays: number;

  @ApiProperty({
    example: true,
    description: 'Trạng thái hoạt động của gói cước',
  })
  @Expose()
  isActive: boolean;

  @ApiProperty({
    example: '2021-01-01',
    description: 'Ngày tạo của gói cước',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    example: '2021-01-01',
    description: 'Ngày cập nhật của gói cước',
  })
  @Expose()
  updatedAt: Date;
}
