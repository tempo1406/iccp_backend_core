import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationRequest } from '@common/dto/pagination.request';
import { InvoiceStatus } from '../../entities/invoice.entity';

export const INVOICE_SORT_FIELDS = [
  'createdAt',
  'issueDate',
  'dueDate',
  'amount',
  'status',
];

export class QueryInvoiceRequest extends PaginationRequest {
  @ApiPropertyOptional({
    enum: InvoiceStatus,
    description: 'Loc theo trang thai hoa don',
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
