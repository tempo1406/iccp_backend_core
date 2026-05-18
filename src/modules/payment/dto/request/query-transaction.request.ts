import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationRequest } from '@common/dto/pagination.request';
import { PaymentTransactionStatus } from '../../entities/payment-transaction.entity';

export const TRANSACTION_SORT_FIELDS = ['createdAt', 'amount', 'status'];

export class QueryTransactionRequest extends PaginationRequest {
  @ApiPropertyOptional({
    enum: PaymentTransactionStatus,
    description: 'Lọc theo trạng thái giao dịch',
  })
  @IsOptional()
  @IsEnum(PaymentTransactionStatus)
  status?: PaymentTransactionStatus;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Lọc theo organization ID',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
