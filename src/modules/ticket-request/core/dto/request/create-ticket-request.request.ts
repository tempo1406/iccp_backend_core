import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  TicketRequestType,
  TicketRequestWorkflowCode,
} from '../../entities/ticket-request.entity';

export class CreateTicketRequestRequest {
  @ApiPropertyOptional({
    enum: TicketRequestType,
    example: TicketRequestType.LEAVE,
  })
  @ValidateIf((obj) => !obj.requestTypeCode)
  @IsEnum(TicketRequestType)
  @IsOptional()
  type?: TicketRequestType;

  @ApiPropertyOptional({
    enum: TicketRequestWorkflowCode,
    default: TicketRequestWorkflowCode.WORKING_TIME,
  })
  @IsOptional()
  @IsEnum(TicketRequestWorkflowCode)
  workflowCode?: TicketRequestWorkflowCode;

  @ApiProperty({ example: 'paid_leave_last_year' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  requestTypeCode: string;

  @ApiProperty({ example: 'Xin nghi phep ngay thu 6' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Toi can nghi 1 ngay de giai quyet viec gia dinh.' })
  @IsString()
  @IsNotEmpty()
  content: string;

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
    example: '307f0059-51fa-43ea-b1dc-a9629ca1389f',
    description:
      'Nguoi duoc gan cho buoc xu ly. Bat buoc neu requester khong co permission ticket_requests.delegate. Neu requester co permission nay thi backend tu dong chon org admin.',
  })
  @IsOptional()
  @IsUUID()
  delegateId?: string;

  @ApiPropertyOptional({
    example: '307f0059-51fa-43ea-b1dc-a9629ca1389f',
    description:
      'User se thao tac tai buoc project_member_declare_ot. Mac dinh = requester.',
  })
  @IsOptional()
  @IsUUID()
  effortOwnerId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: [
      '307f0059-51fa-43ea-b1dc-a9629ca1389f',
      '6fdf6ffc-ed77-94fa-407e-a7b86ed9e59d',
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID(undefined, { each: true })
  ccMemberIds?: string[];

  @ApiPropertyOptional({ example: '2026-03-20T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-03-20T17:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endAt?: string;
}
