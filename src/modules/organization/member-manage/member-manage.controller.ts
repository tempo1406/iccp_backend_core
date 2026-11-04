import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { GetUser } from '@common/decorators/auth/get-user.decorator';

import { MemberManageService } from './member-manage.service';
import { GetMembersQueryRequest } from './dto/request/get-members-query.request';
import { UpdateMemberStatusRequest } from './dto/request/update-member-status.request';
import {
  MemberDetailResponse,
  MemberSummaryResponse,
} from './dto/response/member.response';
import { PaginatedResponse } from '@common/dto/paginated.response';

@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'UUID của organization (bắt buộc cho tất cả endpoint)',
  required: true,
})
@Controller({ path: 'organizations/manage/members', version: '1' })
@ApiBearerAuth('Authorization')
@ApiTags('Organization Member Management')
export class MemberManageController {
  constructor(private readonly memberManageService: MemberManageService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Lấy danh sách members (phân trang + filter + search)
  // ─────────────────────────────────────────────────────────────────────────
  @Get()
  @RequirePermission(PERMISSIONS.TENANT.MEMBERS.LIST)
  @ApiOperationAuto(
    'Lấy danh sách members trong org',
    'Trả về danh sách members thuộc organization (có phân trang, search, filter). ' +
      'Search theo email, firstName, lastName (ILIKE). Filter theo isActive. ' +
      'Cần quyền tenant.members.list.',
  )
  async getMembers(
    @GetOrgId() orgId: string,
    @Query() query: GetMembersQueryRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<MemberSummaryResponse>>> {
    const data = await this.memberManageService.getMembers(orgId, query);
    return new ApiResponseDto(200, 'Fetched members successfully', data);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lấy chi tiết 1 member
  // ─────────────────────────────────────────────────────────────────────────
  @Get(':memberId')
  @RequirePermission(PERMISSIONS.TENANT.MEMBERS.VIEW)
  @ApiParam({
    name: 'memberId',
    description: 'UUID của user (memberId = userId)',
    type: String,
  })
  @ApiOperationAuto(
    'Xem chi tiết member',
    'Trả về thông tin member kèm user info và danh sách roles trong org. ' +
      'Cần quyền tenant.members.view.',
  )
  async getMemberDetail(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<MemberDetailResponse>> {
    const data = await this.memberManageService.getMemberDetail(
      memberId,
      orgId,
    );
    return new ApiResponseDto(200, 'Fetched member detail successfully', data);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cập nhật trạng thái member (active/inactive)
  // ─────────────────────────────────────────────────────────────────────────
  @Put(':memberId/status')
  @RequirePermission(PERMISSIONS.TENANT.MEMBERS.UPDATE)
  @ApiParam({
    name: 'memberId',
    description: 'UUID của user cần cập nhật trạng thái',
    type: String,
  })
  @ApiOperationAuto(
    'Đổi trạng thái member',
    'Cập nhật trạng thái active/inactive của member. ' +
      'Không thể thay đổi trạng thái owner hoặc chính mình. ' +
      'Khi deactivate → xóa user_roles trong org. ' +
      'Cần quyền tenant.members.update.',
  )
  async updateMemberStatus(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetOrgId() orgId: string,
    @Body() dto: UpdateMemberStatusRequest,
    @GetUser('sub') callerId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.memberManageService.updateMemberStatus(
      memberId,
      orgId,
      dto,
      callerId,
    );
    return new ApiResponseDto(200, 'Member status updated successfully');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Xóa member (soft-delete)
  // ─────────────────────────────────────────────────────────────────────────
  @Delete(':memberId')
  @RequirePermission(PERMISSIONS.TENANT.MEMBERS.REMOVE)
  @ApiParam({
    name: 'memberId',
    description: 'UUID của user cần xóa khỏi org',
    type: String,
  })
  @ApiOperationAuto(
    'Xóa member khỏi org',
    'Soft-delete member (isActive=false, isDeleted=true). ' +
      'Không thể xóa owner hoặc chính mình. Xóa luôn user_roles tương ứng. ' +
      'Cần quyền tenant.members.remove.',
  )
  async removeMember(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') callerId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.memberManageService.removeMember(memberId, orgId, callerId);
    return new ApiResponseDto(200, 'Member removed successfully');
  }
}
