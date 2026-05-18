import { PartialType } from '@nestjs/swagger';
import { CreatePaymentMethodRequest } from './create-payment-method.request';

export class UpdatePaymentMethodRequest extends PartialType(
  CreatePaymentMethodRequest,
) {}
