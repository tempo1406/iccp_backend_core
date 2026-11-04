import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { InviteManagerService } from './invite-manager.service';
import { ListInvitationsRequest } from './dto/request/list-invitations.request';
import { InvitationDetailResponse } from './dto/response/invitation-detail.response';
import { InvitationAnalyticsResponse } from './dto/response/invitation-analytics.response';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { GetUser } from '@decorators/auth/get-user.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';

@ApiTags('Organization Invitations')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'ID tổ chức',
  required: true,
})
@UseGuards(PermissionGuard)
@Controller({ path: 'organizations/invitations', version: '1' })
export class InviteManagerController {
  constructor(private readonly inviteManagerService: InviteManagerService) {}

  @Get('analytics')
  @RequirePermission(PERMISSIONS.TENANT.INVITATIONS.LIST)
  @ApiOperation({
    summary: 'Thống kê lời mời của tổ chức',
    description:
      'Trả về tổng số lời mời theo từng trạng thái và tỉ lệ chấp nhận. ' +
      'Needs Attention = EXPIRED + CANCELLED.',
  })
  async getAnalytics(
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<InvitationAnalyticsResponse>> {
    const data = await this.inviteManagerService.getAnalytics(orgId);
    return new ApiResponseDto(
      200,
      'Fetched invitation analytics successfully',
      data,
    );
  }

  @Get()
  @RequirePermission(PERMISSIONS.TENANT.INVITATIONS.LIST)
  @ApiOperation({
    summary: 'Danh sách lời mời của tổ chức (có pagination)',
    description:
      'Trả về danh sách lời mời theo trang. ' +
      'Filter: status=pending|accepted|expired|cancelled. ' +
      'Sort: sortBy=createdAt|email|status|expiresAt, sortOrder=ASC|DESC.',
  })
  async findAll(
    @GetOrgId() orgId: string,
    @Query() query: ListInvitationsRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<InvitationDetailResponse>>> {
    const data = await this.inviteManagerService.findAll(orgId, query);
    return new ApiResponseDto(200, 'Fetched invitations successfully', data);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.TENANT.INVITATIONS.LIST)
  @ApiOperation({ summary: 'Chi tiết một lời mời' })
  @ApiParam({ name: 'id', description: 'UUID của lời mời', type: String })
  async findOne(
    @GetOrgId() orgId: string,
    @Param('id', ParseUUIDPipe) invitationId: string,
  ): Promise<ApiResponseDto<InvitationDetailResponse>> {
    const data = await this.inviteManagerService.findOne(orgId, invitationId);
    return new ApiResponseDto(200, 'Fetched invitation successfully', data);
  }

  @Patch(':id/cancel')
  @RequirePermission(PERMISSIONS.TENANT.INVITATIONS.CANCEL)
  @ApiOperation({
    summary: 'Vô hiệu hoá lời mời',
    description: 'Chỉ có thể huỷ lời mời đang ở trạng thái PENDING.',
  })
  @ApiParam({ name: 'id', description: 'UUID của lời mời', type: String })
  async cancel(
    @GetOrgId() orgId: string,
    @Param('id', ParseUUIDPipe) invitationId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.inviteManagerService.cancel(orgId, invitationId);
    return new ApiResponseDto(200, 'Invitation cancelled successfully');
  }

  @Post(':id/resend')
  @RequirePermission(PERMISSIONS.TENANT.INVITATIONS.RESEND)
  @ApiOperation({
    summary: 'Gửi lại lời mời',
    description:
      'Tạo token mới, gia hạn thêm 7 ngày và gửi lại email. ' +
      'Có thể resend khi trạng thái là PENDING, EXPIRED hoặc CANCELLED. ' +
      'Không thể resend lời mời đã ACCEPTED.',
  })
  @ApiParam({ name: 'id', description: 'UUID của lời mời', type: String })
  async resend(
    @GetOrgId() orgId: string,
    @Param('id', ParseUUIDPipe) invitationId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<InvitationDetailResponse>> {
    const data = await this.inviteManagerService.resend(
      orgId,
      invitationId,
      userId,
    );
    return new ApiResponseDto(200, 'Invitation resent successfully', data);
  }
}
