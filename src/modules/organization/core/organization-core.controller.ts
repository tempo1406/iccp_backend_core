import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CreateOrganizationRequest } from './dto/request/create-organization.request';
import { InviteMembersRequest } from './dto/request/invite-members.request';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '@decorators/auth/get-user.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { OrganizationResponse } from './dto/response/organization.response';
import { OrganizationCoreService } from './organization-core.service';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { AcceptJoinRequest } from './dto/request/accept-join.request';
@ApiTags('Organizations')
@ApiBearerAuth('Authorization')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationCoreController {
  constructor(
    private readonly organizationCoreService: OrganizationCoreService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo Organization mới (đăng ký tenant) và gán luôn plan',
  })
  async create(
    @GetUser('sub') userId: string,
    @Body() dto: CreateOrganizationRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.organizationCoreService.create(userId, dto);
    return new ApiResponseDto(201, 'Organization created successfully');
  }

  @Get('my-orgs')
  @ApiOperation({
    summary: 'Lấy danh sách các Organization mà User hiện tại tham gia',
  })
  async getMyOrgs(
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<OrganizationResponse[]>> {
    const data = await this.organizationCoreService.getMyOrgs(userId);
    return new ApiResponseDto(200, 'Fetched organizations successfully', data);
  }

  @ApiHeader({
    name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
    description: 'ID tổ chức (dùng cho PermissionGuard)',
    required: true,
  })
  @UseGuards(PermissionGuard)
  @Post('invitations')
  @RequirePermission(PERMISSIONS.TENANT.MEMBERS.ADD)
  @ApiOperation({ summary: '[ORG_ADMIN] Mời member vào Organization' })
  async inviteMembers(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: InviteMembersRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.organizationCoreService.inviteMembers(userId, orgId, dto);
    return new ApiResponseDto(201, 'Invitations sent successfully');
  }

  @Post('invitations/accept')
  @ApiOperation({
    summary: 'User accept lời mời tham gia qua token gửi trong email',
    description:
      'Người dùng phải đăng nhập đúng tài khoản member đã được mời vào organization ' +
      'thì mới có thể tự chấp nhận (accept) lời mời.',
  })
  async acceptInvitation(
    @GetUser('sub') userId: string,
    @Body() dto: AcceptJoinRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.organizationCoreService.acceptInvitation(userId, dto);
    return new ApiResponseDto(200, 'Invitation accepted successfully');
  }
}
