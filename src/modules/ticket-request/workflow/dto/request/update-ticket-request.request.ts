import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TicketRequestType } from '../../../core/entities/ticket-request.entity';

export class UpdateTicketRequestRequest {
  @ApiPropertyOptional({
    enum: TicketRequestType,
    example: TicketRequestType.WFH,
  })
  @IsOptional()
  @IsEnum(TicketRequestType)
  type?: TicketRequestType;

  @ApiPropertyOptional({ example: 'paid_leave_last_year' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  requestTypeCode?: string;

  @ApiPropertyOptional({ example: 'Cap nhat yeu cau nghi phep' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Da cap nhat noi dung theo yeu cau.' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 'Paid leave of last year' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  requestTypeName?: string;

  @ApiPropertyOptional({ example: 'annual_leave' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reasonCode?: string;

  @ApiPropertyOptional({ example: 'Enter detail reason ...' })
  @IsOptional()
  @IsString()
  reasonDetail?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['307f0059-51fa-43ea-b1dc-a9629ca1389f'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID(undefined, { each: true })
  ccMemberIds?: string[];

  @ApiPropertyOptional({
    example: '307f0059-51fa-43ea-b1dc-a9629ca1389f',
    description:
      'Nguoi duoc gan cho buoc xu ly tiep theo sau khi submit lai. User nay bat buoc co permission ticket_requests.delegate.',
  })
  @IsOptional()
  @IsUUID()
  nextDelegateId?: string;

  @ApiPropertyOptional({ example: '2026-03-22T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-03-22T17:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endAt?: string;
}
