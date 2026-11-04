import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { RequirePermission } from '@common/decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';

import { TicketRequestCoreService } from './core.service';
import { CreateTicketRequestRequest } from './dto/request/create-ticket-request.request';
import { CreateOvertimeRequestRequest } from './dto/request/create-overtime-request.request';
import { ListTicketRequestsRequest } from './dto/request/list-ticket-requests.request';
import {
  TicketRequestDetailResponse,
  TicketRequestDisplayTypeOptionResponse,
  TicketRequestReasonOptionResponse,
  TicketRequestSummaryResponse,
  TicketRequestDelegateOptionResponse,
  TicketRequestUserResponse,
} from './dto/response/ticket-request.response';

class OtEffortOwnerOptionsQuery {
  @ApiPropertyOptional({
    description: 'UUID cua project de filter effort owner',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'UUID cua organization (bat buoc cho tat ca endpoint)',
  required: true,
})
@Controller({ path: 'ticket-requests', version: '1' })
@ApiBearerAuth('Authorization')
@ApiTags('Ticket Requests')
export class TicketRequestCoreController {
  constructor(private readonly coreService: TicketRequestCoreService) {}

  @Post()
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.CREATE)
  @ApiOperationAuto(
    'Tao ticket request',
    'Tao ticket theo enterprise workflow (working_time/overtime_opic/overtime_standard) va submit vao gate approve dau tien.',
  )
  async createTicket(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateTicketRequestRequest,
  ): Promise<ApiResponseDto<TicketRequestDetailResponse>> {
    const data = await this.coreService.createTicket(orgId, userId, dto);
    return new ApiResponseDto(201, 'Ticket request created successfully', data);
  }

  @Get('me')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.LIST_OWN)
  @ApiOperationAuto(
    'Lay danh sach ticket lien quan toi',
    'Requester/Delegate/Effort owner/CC xem danh sach ticket lien quan den minh (phan trang + filter).',
  )
  async getMyTickets(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: ListTicketRequestsRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<TicketRequestSummaryResponse>>> {
    const data = await this.coreService.getMyTickets(orgId, userId, query);
    return new ApiResponseDto(
      200,
      'Fetched my ticket requests successfully',
      data,
    );
  }

  @Get('manage')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.LIST_ORG)
  @ApiOperationAuto(
    'Lay danh sach ticket theo organization',
    'Manager/HR/Admin xem toan bo ticket requests trong organization (phan trang + filter).',
  )
  async getManageTickets(
    @GetOrgId() orgId: string,
    @Query() query: ListTicketRequestsRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<TicketRequestSummaryResponse>>> {
    const data = await this.coreService.getManageTickets(orgId, query);
    return new ApiResponseDto(
      200,
      'Fetched organization ticket requests successfully',
      data,
    );
  }

  @Get('request-types')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.CREATE)
  @ApiOperationAuto(
    'Lay catalog request types',
    'Tra ve danh sach request type chi tiet de FE render dropdown Create Request.',
  )
  getRequestTypeOptions(): ApiResponseDto<
    TicketRequestDisplayTypeOptionResponse[]
  > {
    const data = this.coreService.getRequestTypeOptions();
    return new ApiResponseDto(
      200,
      'Fetched request type catalog successfully',
      data,
    );
  }

  @Get('reason-options')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.CREATE)
  @ApiOperationAuto(
    'Lay catalog reason options',
    'Tra ve danh sach reason options de FE render dropdown Reason.',
  )
  getReasonOptions(): ApiResponseDto<TicketRequestReasonOptionResponse[]> {
    const data = this.coreService.getReasonOptions();
    return new ApiResponseDto(200, 'Fetched reason options successfully', data);
  }

  @Get('delegate-options')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.CREATE)
  @ApiOperationAuto(
    'Lay danh sach delegate hop le',
    'Chi tra ve thanh vien organization co permission ticket_requests.delegate de FE render dropdown Delegate.',
  )
  async getDelegateOptions(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TicketRequestDelegateOptionResponse[]>> {
    const data = await this.coreService.getDelegateOptions(orgId, userId);
    return new ApiResponseDto(
      200,
      'Fetched delegate options successfully',
      data,
    );
  }

  @Get('cc-member-options')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.CREATE)
  @ApiOperationAuto(
    'Lay danh sach thanh vien co the CC',
    'Tra ve tat ca thanh vien active trong org (tru ban than) de FE render dropdown CC Members.',
  )
  async getCcMemberOptions(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TicketRequestUserResponse[]>> {
    const data = await this.coreService.getCcMemberOptions(orgId, userId);
    return new ApiResponseDto(
      200,
      'Fetched CC member options successfully',
      data,
    );
  }

  @Post('overtime')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.CREATE_OVERTIME)
  @ApiOperationAuto(
    'Tao overtime ticket request',
    'PM tao request OT voi form rieng biet (projectId, plannedHours, affectedMemberIds, scope). Workflow: OVERTIME_STANDARD.',
  )
  async createOvertimeTicket(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateOvertimeRequestRequest,
  ): Promise<ApiResponseDto<TicketRequestDetailResponse>> {
    const data = await this.coreService.createOvertimeTicket(
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(
      201,
      'Overtime ticket request created successfully',
      data,
    );
  }

  @Get('ot-effort-owner-options')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.CREATE_OVERTIME)
  @ApiOperationAuto(
    'Lay danh sach effort owner options cho OT',
    'Co projectId → tra ve project members. Khong co projectId → tra ve tat ca org members.',
  )
  async getOtEffortOwnerOptions(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: OtEffortOwnerOptionsQuery,
  ): Promise<ApiResponseDto<TicketRequestUserResponse[]>> {
    const data = await this.coreService.getOtEffortOwnerOptions(
      orgId,
      userId,
      query.projectId,
    );
    return new ApiResponseDto(
      200,
      'Fetched OT effort owner options successfully',
      data,
    );
  }

  @Get('ot-project-options')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.CREATE_OVERTIME)
  @ApiOperationAuto(
    'Lay danh sach project options cho OT',
    'Tra ve cac project ma current user la project manager hoac owner de FE render dropdown chon project khi tao OT.',
  )
  async getOtProjectOptions(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<{ id: string; name: string }[]>> {
    const data = await this.coreService.getOtProjectOptions(orgId, userId);
    return new ApiResponseDto(
      200,
      'Fetched OT project options successfully',
      data,
    );
  }

  @Get(':ticketId')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.VIEW)
  @ApiParam({ name: 'ticketId', type: String })
  @ApiOperationAuto(
    'Lay chi tiet ticket',
    'Tra ve chi tiet ticket kem workflow state, CC va activity logs.',
  )
  async getTicketDetail(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TicketRequestDetailResponse>> {
    const data = await this.coreService.getTicketDetail(
      ticketId,
      orgId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Fetched ticket request detail successfully',
      data,
    );
  }

  @Post(':ticketId/cancel')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.CANCEL_OWN)
  @ApiParam({ name: 'ticketId', type: String })
  @ApiOperationAuto(
    'Huy ticket',
    'Requester huy ticket khi ticket chua ket thuc.',
  )
  async cancelTicket(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TicketRequestDetailResponse>> {
    const data = await this.coreService.cancelTicket(ticketId, orgId, userId);
    return new ApiResponseDto(
      200,
      'Ticket request canceled successfully',
      data,
    );
  }
}
