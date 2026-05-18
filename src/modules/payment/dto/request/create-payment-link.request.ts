import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class CreatePaymentLinkRequest {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID cua goi cuoc muon dang ky',
  })
  @IsUUID()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    enum: BillingCycle,
    example: BillingCycle.MONTHLY,
    description: 'Chu ky thanh toan',
  })
  @IsEnum(BillingCycle)
  @IsNotEmpty()
  billingCycle: BillingCycle;
}
