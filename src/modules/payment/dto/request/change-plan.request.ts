import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { BillingCycle } from './create-payment-link.request';

export class ChangePlanRequest {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID cua goi cuoc moi muon chuyen sang',
  })
  @IsUUID()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    enum: BillingCycle,
    example: BillingCycle.MONTHLY,
    description: 'Chu ky thanh toan cho goi moi',
  })
  @IsEnum(BillingCycle)
  @IsNotEmpty()
  billingCycle: BillingCycle;
}
