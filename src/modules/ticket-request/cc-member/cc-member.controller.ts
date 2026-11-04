import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';

import { TicketRequestCcMemberService } from './cc-member.service';
import { AddCcMembersRequest } from './dto/request/manage-cc-members.request';
import { TicketRequestDetailResponse } from '../core/dto/response/ticket-request.response';

@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'UUID cua organization (bat buoc cho tat ca endpoint)',
  required: true,
})
@Controller({ path: 'ticket-requests', version: '1' })
@ApiBearerAuth('Authorization')
@ApiTags('Ticket Request CC Members')
export class TicketRequestCcMemberController {
  constructor(private readonly ccMemberService: TicketRequestCcMemberService) {}

  @Post(':ticketId/cc-members')
  @ApiParam({ name: 'ticketId', type: String })
  @ApiOperationAuto(
    'Them CC members',
    'Them nhieu thanh vien vao danh sach CC cua ticket.',
  )
  async addCcMembers(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: AddCcMembersRequest,
  ): Promise<ApiResponseDto<TicketRequestDetailResponse>> {
    const data = await this.ccMemberService.addCcMembers(
      ticketId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'CC members added successfully', data);
  }

  @Delete(':ticketId/cc-members/:memberId')
  @ApiParam({ name: 'ticketId', type: String })
  @ApiParam({ name: 'memberId', type: String })
  @ApiOperationAuto(
    'Xoa CC member',
    'Xoa 1 thanh vien khoi danh sach CC cua ticket.',
  )
  async removeCcMember(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TicketRequestDetailResponse>> {
    const data = await this.ccMemberService.removeCcMember(
      ticketId,
      orgId,
      userId,
      memberId,
    );
    return new ApiResponseDto(200, 'CC member removed successfully', data);
  }
}
