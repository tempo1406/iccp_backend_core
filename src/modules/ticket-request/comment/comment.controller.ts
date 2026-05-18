import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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

import { TicketRequestCommentService } from './comment.service';
import { CreateTicketCommentRequest } from './dto/request/create-ticket-comment.request';
import { TicketRequestCommentResponse } from '../core/dto/response/ticket-request.response';

@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'UUID cua organization (bat buoc cho tat ca endpoint)',
  required: true,
})
@Controller({ path: 'ticket-requests', version: '1' })
@ApiBearerAuth('Authorization')
@ApiTags('Ticket Request Comments')
export class TicketRequestCommentController {
  constructor(private readonly commentService: TicketRequestCommentService) {}

  @Get(':ticketId/comments')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.VIEW)
  @ApiParam({ name: 'ticketId', type: String })
  @ApiOperationAuto(
    'Lay comments',
    'Lay danh sach comments trong ticket request.',
  )
  async getComments(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<TicketRequestCommentResponse[]>> {
    const data = await this.commentService.getComments(ticketId, orgId, userId);
    return new ApiResponseDto(
      200,
      'Fetched ticket comments successfully',
      data,
    );
  }

  @Post(':ticketId/comments')
  @RequirePermission(PERMISSIONS.TICKET_REQUESTS.COMMENT)
  @ApiParam({ name: 'ticketId', type: String })
  @ApiOperationAuto(
    'Them comment',
    'Requester/Delegate/CC members them comment vao ticket.',
  )
  async addComment(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateTicketCommentRequest,
  ): Promise<ApiResponseDto<TicketRequestCommentResponse>> {
    const data = await this.commentService.addComment(
      ticketId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(201, 'Comment added successfully', data);
  }
}
