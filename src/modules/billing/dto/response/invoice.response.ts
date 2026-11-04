import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { InvoiceStatus } from '../../entities/invoice.entity';

@Exclude()
export class InvoiceResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'INV-1234567890' })
  @Expose()
  invoiceNumber: string;

  @ApiProperty({ example: 790000 })
  @Expose()
  amount: number;

  @ApiProperty({ example: 0 })
  @Expose()
  taxAmount: number;

  @ApiProperty({ example: 790000 })
  @Expose()
  totalAmount: number;

  @ApiProperty({ example: 'VND' })
  @Expose()
  currency: string;

  @ApiProperty({ enum: InvoiceStatus, example: InvoiceStatus.PAID })
  @Expose()
  status: InvoiceStatus;

  @ApiProperty({ example: '2025-01-01' })
  @Expose()
  issueDate: Date;

  @ApiProperty({ example: '2025-01-08' })
  @Expose()
  dueDate: Date;

  @ApiPropertyOptional({ example: '2025-01-02T10:00:00.000Z' })
  @Expose()
  paidAt?: Date;

  @ApiPropertyOptional({ example: 'payos' })
  @Expose()
  paymentMethod?: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @Expose()
  createdAt: Date;
}
