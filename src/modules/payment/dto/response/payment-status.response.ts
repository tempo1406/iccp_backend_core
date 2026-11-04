import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PaymentStatusResponse {
  @ApiProperty({ example: 1234567890, description: 'Mã đơn hàng PayOS' })
  @Expose()
  orderCode: number;

  @ApiProperty({ example: 'PAID', description: 'Trạng thái thanh toán' })
  @Expose()
  status: string;

  @ApiProperty({ example: 790000, description: 'Số tiền' })
  @Expose()
  amount: number;

  @ApiProperty({ example: 790000, description: 'Số tiền đã thanh toán' })
  @Expose()
  amountPaid: number;

  @ApiProperty({ example: 0, description: 'Số tiền còn lại' })
  @Expose()
  amountRemaining: number;

  @ApiPropertyOptional({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Ngày tạo',
  })
  @Expose()
  createdAt?: string;

  @ApiPropertyOptional({ description: 'Danh sách giao dịch từ PayOS' })
  @Expose()
  transactions?: any[];
}
