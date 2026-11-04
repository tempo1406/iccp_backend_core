import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PaymentLinkResponse {
  @ApiProperty({
    example: 'https://pay.payos.vn/web/abc123',
    description: 'URL checkout thanh toán PayOS',
  })
  @Expose()
  checkoutUrl: string;

  @ApiProperty({ example: 1234567890, description: 'Mã đơn hàng PayOS' })
  @Expose()
  orderCode: number;

  @ApiProperty({ example: 790000, description: 'Số tiền thanh toán' })
  @Expose()
  amount: number;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID giao dịch nội bộ',
  })
  @Expose()
  transactionId: string;
}
