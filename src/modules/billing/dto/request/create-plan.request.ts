import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const MAX_BILLING_AMOUNT = 9999999999.99;

export class CreatePlanRequest {
  @ApiProperty({ example: 'Pro', description: 'Tên gói cước' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'pro', description: 'Mã gói cước (unique)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ example: 'Gói cước dành cho doanh nghiệp vừa' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 490000, description: 'Giá hàng tháng (VND)' })
  @IsNumber()
  @Min(0)
  @Max(MAX_BILLING_AMOUNT)
  priceMonthly: number;

  @ApiProperty({ example: 4900000, description: 'Giá hàng năm (VND)' })
  @IsNumber()
  @Min(0)
  @Max(MAX_BILLING_AMOUNT)
  priceYearly: number;

  @ApiPropertyOptional({ example: 10, description: 'Số user tối đa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsers?: number;

  @ApiPropertyOptional({ example: 200, description: 'Số tài liệu tối đa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDocuments?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Dung lượng lưu trữ tối đa (GB)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStorageGb?: number;

  @ApiPropertyOptional({ example: 10, description: 'Số dự án tối đa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxProjects?: number;

  @ApiPropertyOptional({
    example: { chat: true, priority_support: false },
    description: 'Feature flags (JSONB)',
  })
  @IsOptional()
  features?: any;

  @ApiPropertyOptional({
    example: 14,
    description: 'Số ngày dùng thử miễn phí (0 = không có trial)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
