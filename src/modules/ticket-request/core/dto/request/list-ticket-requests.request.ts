import { PaginationRequest } from '@common/dto/pagination.request';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  TicketRequestStatus,
  TicketRequestType,
  TicketRequestWorkflowCode,
} from '../../entities/ticket-request.entity';

export enum TicketRequestSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  STATUS = 'status',
}

export const TICKET_REQUEST_SORT_FIELDS = [
  TicketRequestSortBy.CREATED_AT,
  TicketRequestSortBy.UPDATED_AT,
  TicketRequestSortBy.STATUS,
];

export class ListTicketRequestsRequest extends PaginationRequest {
  @ApiPropertyOptional({ enum: TicketRequestStatus })
  @IsOptional()
  @IsEnum(TicketRequestStatus)
  status?: TicketRequestStatus;

  @ApiPropertyOptional({ enum: TicketRequestType })
  @IsOptional()
  @IsEnum(TicketRequestType)
  type?: TicketRequestType;

  @ApiPropertyOptional({ enum: TicketRequestWorkflowCode })
  @IsOptional()
  @IsEnum(TicketRequestWorkflowCode)
  workflowCode?: TicketRequestWorkflowCode;

  @ApiPropertyOptional({ example: 'pm_confirm' })
  @IsOptional()
  @IsString()
  currentStepCode?: string;

  @ApiPropertyOptional({ example: 'paid_leave_last_year' })
  @IsOptional()
  @IsString()
  requestTypeCode?: string;

  @ApiPropertyOptional({ example: 'dce7f95f-6490-4fb3-a2ea-c12b6b7792d8' })
  @IsOptional()
  @IsUUID()
  requesterId?: string;

  @ApiPropertyOptional({ example: 'dce7f95f-6490-4fb3-a2ea-c12b6b7792d8' })
  @IsOptional()
  @IsUUID()
  delegateId?: string;

  @ApiPropertyOptional({
    example: 'nghi phep',
    description: 'Tim theo code/title/content/request_type_name/reason_code',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-03-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
