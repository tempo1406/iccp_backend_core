import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrgListItemResponse {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID của tổ chức',
  })
  id: string;

  @ApiProperty({ example: 'ICCP Company', description: 'Tên tổ chức' })
  name: string;

  @ApiProperty({ example: 'iccp-company', description: 'Slug tổ chức' })
  slug: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'Logo URL',
  })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'Technology', description: 'Ngành nghề' })
  industry?: string;

  @ApiPropertyOptional({
    example: 'medium',
    description: 'Quy mô: small | medium | large | enterprise',
  })
  size?: string;

  @ApiProperty({ example: true, description: 'Tổ chức đang hoạt động' })
  isActive: boolean;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Ngày tạo tổ chức (hoạt động từ khi nào)',
  })
  createdAt: Date;

  // ------- Owner info -------
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID của owner',
  })
  ownerId: string;

  @ApiProperty({ example: 'owner@example.com', description: 'Email của owner' })
  ownerEmail: string;

  @ApiPropertyOptional({
    example: 'Nguyen Van A',
    description: 'Họ tên đầy đủ của owner',
  })
  ownerFullName?: string;

  // ------- Members -------
  @ApiProperty({ example: 5, description: 'Tổng số thành viên đang active' })
  memberCount: number;

  // ------- Subscription / Plan -------
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID gói subscription hiện tại',
  })
  subscriptionId?: string;

  @ApiPropertyOptional({
    example: 'Professional',
    description: 'Tên gói subscription',
  })
  planName?: string;

  @ApiPropertyOptional({
    example: 'professional',
    description: 'Mã gói subscription',
  })
  planCode?: string;

  @ApiPropertyOptional({
    example: 'active',
    description:
      'Trạng thái subscription: active | pending_payment | cancelled | expired | trial',
  })
  subscriptionStatus?: string;

  @ApiPropertyOptional({
    example: 'yearly',
    description: 'Chu kỳ billing: monthly | yearly',
  })
  billingCycle?: string;

  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Ngày bắt đầu billing',
  })
  billingStartDate?: Date;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Ngày hết hạn billing',
  })
  billingEndDate?: Date;
}
