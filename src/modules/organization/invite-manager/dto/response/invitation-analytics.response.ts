import { ApiProperty } from '@nestjs/swagger';

export class InvitationAnalyticsResponse {
  @ApiProperty({ description: 'Tổng số lời mời', example: 20 })
  total: number;

  @ApiProperty({ description: 'Đang chờ chấp nhận (PENDING)', example: 8 })
  pending: number;

  @ApiProperty({ description: 'Đã chấp nhận (ACCEPTED)', example: 10 })
  accepted: number;

  @ApiProperty({
    description: 'Cần chú ý: đã hết hạn (EXPIRED) + đã huỷ (CANCELLED)',
    example: 2,
  })
  needsAttention: number;

  @ApiProperty({ description: 'Đã hết hạn (EXPIRED)', example: 1 })
  expired: number;

  @ApiProperty({ description: 'Đã huỷ (CANCELLED)', example: 1 })
  cancelled: number;

  @ApiProperty({
    description:
      'Tỉ lệ chấp nhận (accepted / total * 100), làm tròn 1 chữ số thập phân',
    example: 50.0,
  })
  acceptanceRate: number;
}
