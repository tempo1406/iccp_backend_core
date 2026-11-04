import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
} from 'class-validator';
import { PaymentMethodType } from '../../entities/payment-method.entity';

export class CreatePaymentMethodRequest {
  @ApiProperty({
    enum: PaymentMethodType,
    example: PaymentMethodType.BANK_TRANSFER,
    description: 'Loai phuong thuc thanh toan',
  })
  @IsEnum(PaymentMethodType)
  @IsNotEmpty()
  type: PaymentMethodType;

  @ApiProperty({
    example: { bankName: 'Vietcombank', accountNumber: '1234567890' },
    description: 'Chi tiet phuong thuc thanh toan (JSON)',
  })
  @IsObject()
  @IsNotEmpty()
  details: Record<string, any>;

  @ApiPropertyOptional({
    example: false,
    description: 'Dat lam phuong thuc mac dinh',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
