import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { PaymentMethodType } from '../../entities/payment-method.entity';

@Exclude()
export class PaymentMethodResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.BANK_TRANSFER })
  @Expose()
  type: PaymentMethodType;

  @ApiProperty({ example: { bankName: 'Vietcombank', accountNumber: '1234567890' } })
  @Expose()
  details: Record<string, any>;

  @ApiProperty({ example: false })
  @Expose()
  isDefault: boolean;

  @ApiProperty({ example: true })
  @Expose()
  isActive: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @Expose()
  updatedAt: Date;
}
