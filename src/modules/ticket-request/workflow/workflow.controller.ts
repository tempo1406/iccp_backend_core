import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { RequirePermission } from '@common/decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';

import { TicketRequestWorkflowService } from './workflow.service';
import { DeclareOtEffortRequest } from './dto/request/declare-ot-effort.request';
import { UpdateTicketRequestRequest } from './dto/request/update-ticket-request.request';
import {
  ApproveTicketRequestRequest,
  RejectTicketRequestRequest,
  RequestChangesTicketRequestRequest,
} from './dto/request/decision-ticket-request.request';
import { TicketRequestDetailResponse } from '../core/dto/response/ticket-request.response';

@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'UUID cua organization (bat buoc cho tat ca endpoint)',
  required: true,
})
@Controller({ path: 'ticket-requests', version: '1' })
@ApiBearerAuth('Authorization')
@ApiTags('Ticket Request Workflow')
export class TicketRequestWorkflowController {
  constructor(private readonly workflowService: TicketRequestWorkflowService) {}

  @Patch(':ticketId/declare-ot-effort')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.UPDATE_OWN)
  @ApiParam({ name: 'ticketId', type: String })
  @ApiOperationAuto(
    'Khai bao effort OT',
    'effortOwner khai bao effort OT thuc te tai buoc PROJECT_MEMBER_DECLARE_OT. Chuyen ticket sang PM_CONFIRM.',
  )
  async declareOtEffort(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: DeclareOtEffortRequest,
  ): Promise<ApiResponseDto<TicketRequestDetailResponse>> {
    const data = await this.workflowService.declareOtEffort(
      ticketId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'OT effort declared successfully', data);
  }

  @Patch(':ticketId')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.UPDATE_OWN)
  @ApiParam({ name: 'ticketId', type: String })
  @ApiOperationAuto(
    'Cap nhat + submit lai ticket',
    'Actor o submit-step cap nhat ticket va submit lai vao buoc xu ly tiep theo (co the truyen nextDelegateId).',
  )
  async updateTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpdateTicketRequestRequest,
  ): Promise<ApiResponseDto<TicketRequestDetailResponse>> {
    const data = await this.workflowService.updateTicket(
      ticketId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Ticket request updated successfully', data);
  }

  @Post(':ticketId/approve')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.DELEGATE)
  @ApiParam({ name: 'ticketId', type: String })
  @ApiOperationAuto(
    'Approve buoc workflow hien tai',
    'Approve step hien tai. Co the truyen nextDelegateId de gan nguoi cho gate xu ly tiep theo.',
  )
  async approveTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: ApproveTicketRequestRequest,
  ): Promise<ApiResponseDto<TicketRequestDetailResponse>> {
    const data = await this.workflowService.approveTicket(
      ticketId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(
      200,
      'Ticket request approved successfully',
      data,
    );
  }

  @Post(':ticketId/reject')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.DELEGATE)
  @ApiParam({ name: 'ticketId', type: String })
  @ApiOperationAuto(
    'Reject buoc workflow hien tai',
    'Reject theo route cua workflow (terminal hoac send-back ve submit-step).',
  )
  async rejectTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: RejectTicketRequestRequest,
  ): Promise<ApiResponseDto<TicketRequestDetailResponse>> {
    const data = await this.workflowService.rejectTicket(
      ticketId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(
      200,
      'Ticket request rejected successfully',
      data,
    );
  }

  @Post(':ticketId/request-changes')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.DELEGATE)
  @ApiParam({ name: 'ticketId', type: String })
  @ApiOperationAuto(
    'Request changes',
    'Ep workflow quay ve submit-step de requester/effort-owner cap nhat lai.',
  )
  async requestChangesTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: RequestChangesTicketRequestRequest,
  ): Promise<ApiResponseDto<TicketRequestDetailResponse>> {
    const data = await this.workflowService.requestChangesTicket(
      ticketId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Requested changes successfully', data);
  }
}
