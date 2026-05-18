import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { PaymentTransactionStatus } from '../../entities/payment-transaction.entity';

@Exclude()
export class PaymentTransactionResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  organizationId: string;

  @ApiProperty({ example: 1234567890 })
  @Expose()
  orderCode: number;

  @ApiProperty({ example: 790000 })
  @Expose()
  amount: number;

  @ApiProperty({ example: 'VND' })
  @Expose()
  currency: string;

  @ApiProperty({ enum: PaymentTransactionStatus })
  @Expose()
  status: PaymentTransactionStatus;

  @ApiPropertyOptional({ example: 'Thanh toán gói Standard - monthly' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ example: 'https://pay.payos.vn/web/abc123' })
  @Expose()
  checkoutUrl?: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @Expose()
  updatedAt: Date;
}
