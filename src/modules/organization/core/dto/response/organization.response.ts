import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationResponse {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID của tổ chức',
  })
  id: string;

  @ApiProperty({ example: 'ICCP Company', description: 'Tên của tổ chức' })
  name: string;

  @ApiProperty({ example: 'iccp-company', description: 'Slug của tổ chức' })
  slug: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID của người tạo tổ chức',
  })
  ownerId: string;

  @ApiPropertyOptional({ description: 'Mô tả của tổ chức' })
  description?: string;

  @ApiPropertyOptional({ description: 'URL logo của tổ chức' })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'Technology', description: 'Ngành nghề' })
  industry?: string;

  @ApiPropertyOptional({
    example: 'medium',
    description: 'Quy mô tổ chức: small, medium, large, enterprise',
  })
  size?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID gói subscription đang dùng',
  })
  subscriptionPlanId?: string;

  @ApiProperty({
    example: true,
    description: 'Tổ chức có đang hoạt động không',
  })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Cài đặt tuỳ chỉnh của tổ chức (JSON)' })
  settings?: Record<string, any>;

  @ApiProperty({ example: '2021-01-01', description: 'Ngày tạo' })
  createdAt: Date;

  @ApiProperty({ example: '2021-01-01', description: 'Ngày cập nhật' })
  updatedAt: Date;
}
