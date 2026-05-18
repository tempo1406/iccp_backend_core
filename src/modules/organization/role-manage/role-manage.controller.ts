import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  Post,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { RoleManageService } from './role-manage.service';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { ApiResponseDto } from '@common/dto/api-response.dto';

import { UpdateRoleRequest } from './dto/request/update-role.request';
import { CreateOrgRoleRequest } from './dto/request/create-org-role.request';
import { AssignPermissionsToOrgRoleRequest } from './dto/request/assign-permissions.request';
import { RevokePermissionsRequest } from './dto/request/revoke-permissions.request';
import { UpdateRolePermissionsRequest } from './dto/request/update-role-permissions.request';
import { AssignRoleToMemberRequest } from './dto/request/assign-role-to-member.request';
import { RevokeRoleFromMemberRequest } from './dto/request/revoke-role-from-member.request';
import { GetRolesQueryRequest } from './dto/request/get-roles-query.request';
import { OrgRoleDetailResponse } from './dto/response/org-role-detail.response';
import { UserOrgRoleResponse } from './dto/response/user-org-role.response';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { OrgRoleResponse } from './dto/response/org-role.response';
import { ScopeType } from '@modules/rbac/entities/user-role.entity';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { GetUser } from '@common/decorators/auth/get-user.decorator';

@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'UUID của organization (bắt buộc cho tất cả endpoint)',
  required: true,
})
@Controller({ path: 'organizations/roles', version: '1' })
@ApiBearerAuth('Authorization')
@ApiTags('Organization Role Management')
export class RoleManageController {
  constructor(private readonly roleManageService: RoleManageService) {}

  // Lấy role hiện tại của user trong org
  @Get('me')
  @ApiQuery({
    name: 'scopeType',
    required: false,
    enum: ScopeType,
    description:
      'Lọc theo loại scope (không bắt buộc). Mặc định trả về tất cả.',
  })
  @ApiOperationAuto(
    'Lấy role của tôi trong org',
    'Trả về role(s) hiện tại của user đang đăng nhập trong organization. ' +
      'Tùy chọn lọc theo scopeType: organization hoặc project. Mỗi item trong response đã chứa scopeType.',
  )
  async getMyRole(
    @GetUser('sub') userId: string,
    @GetOrgId() orgId: string,
    @Query('scopeType') scopeType?: ScopeType,
  ): Promise<ApiResponseDto<UserOrgRoleResponse[]>> {
    const data = await this.roleManageService.getMyRole(
      userId,
      orgId,
      scopeType,
    );
    return new ApiResponseDto(200, 'Fetched my role successfully', data);
  }

  // Tạo role mới trong org
  @Post()
  @RequirePermission(PERMISSIONS.RBAC.ROLES.CREATE)
  @ApiOperationAuto(
    'Tạo role trong org',
    'Tạo role mới trong organization. Có thể gán permissions ngay lúc tạo. ' +
      'Không thể tạo trùng tên trong cùng org. Cần quyền rbac.roles.create.',
  )
  async createRole(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateOrgRoleRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.roleManageService.createRole(dto, userId, orgId);
    return new ApiResponseDto(201, 'Role created successfully');
  }

  // Lấy danh sách roles trong org
  @Get()
  @RequirePermission(PERMISSIONS.RBAC.ROLES.LIST)
  @ApiOperationAuto(
    'Lấy danh sách roles trong org',
    'Trả về danh sách roles thuộc organization (có phân trang và filter). Cần quyền rbac.roles.list.',
  )
  async getRoles(
    @GetOrgId() orgId: string,
    @Query() query: GetRolesQueryRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<OrgRoleResponse>>> {
    const data = await this.roleManageService.getRoles(orgId, query);
    return new ApiResponseDto(200, 'Fetched roles successfully', data);
  }

  // Lấy chi tiết 1 role (kèm permissions)
  @Get(':roleId')
  @RequirePermission(PERMISSIONS.RBAC.ROLES.VIEW)
  @ApiParam({
    name: 'roleId',
    description: 'UUID của role',
    type: String,
  })
  @ApiOperationAuto(
    'Xem chi tiết role',
    'Trả về thông tin role kèm danh sách permissions. Cần quyền rbac.roles.view.',
  )
  async getRoleDetail(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<OrgRoleDetailResponse>> {
    const data = await this.roleManageService.getRoleDetail(roleId, orgId);
    return new ApiResponseDto(200, 'Fetched role detail successfully', data);
  }

  // Cập nhật role
  @Put(':roleId')
  @RequirePermission(PERMISSIONS.RBAC.ROLES.UPDATE)
  @ApiParam({
    name: 'roleId',
    description: 'UUID của role cần cập nhật',
    type: String,
  })
  @ApiOperationAuto(
    'Cập nhật role trong org',
    'Cập nhật name/description. Không cho sửa role owner mặc định. Cần quyền rbac.roles.update.',
  )
  async updateRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @GetOrgId() orgId: string,
    @Body() dto: UpdateRoleRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.roleManageService.updateRole(roleId, orgId, dto);
    return new ApiResponseDto(200, 'Role updated successfully');
  }

  // Xoá role
  @Delete(':roleId')
  @RequirePermission(PERMISSIONS.RBAC.ROLES.DELETE)
  @ApiParam({
    name: 'roleId',
    description: 'UUID của role cần xoá',
    type: String,
  })
  @ApiOperationAuto(
    'Xoá role trong org',
    'Xoá role. Không cho xoá owner/member mặc định. Cần quyền rbac.roles.delete.',
  )
  async deleteRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.roleManageService.deleteRole(roleId, orgId);
    return new ApiResponseDto(200, 'Role deleted successfully');
  }

  // Gán permissions cho role
  @Post('permissions/assign')
  @RequirePermission(PERMISSIONS.RBAC.ROLES.ASSIGN_PERMISSIONS)
  @ApiOperationAuto(
    'Gán permissions cho role',
    'Gán permission codes vào role trong org. Anti-privilege-escalation: ' +
      'caller không thể gán permission mình không có. Cần quyền rbac.roles.assign_permissions.',
  )
  async assignPermissions(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: AssignPermissionsToOrgRoleRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.roleManageService.assignPermissions(dto, userId, orgId);
    return new ApiResponseDto(200, 'Permissions assigned successfully');
  }

  // Thu hồi permissions khỏi role
  @Post('permissions/revoke')
  @RequirePermission(PERMISSIONS.RBAC.ROLES.REVOKE_PERMISSIONS)
  @ApiOperationAuto(
    'Thu hồi permissions khỏi role',
    'Thu hồi permission codes khỏi role trong org. Cần quyền rbac.roles.revoke_permissions.',
  )
  async revokePermissions(
    @GetOrgId() orgId: string,
    @Body() dto: RevokePermissionsRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.roleManageService.revokePermissions(dto, orgId);
    return new ApiResponseDto(200, 'Permissions revoked successfully');
  }

  @Put(':roleId/permissions')
  @ApiParam({
    name: 'roleId',
    description: 'UUID của role cần đồng bộ permissions',
    type: String,
  })
  @ApiOperationAuto(
    'Cập nhật permissions của role',
    'Đồng bộ permission codes cho một role trong org trong một request duy nhất. ' +
      'Caller chỉ có thể thêm hoặc thu hồi những permission mình có. ' +
      'Các permission caller không được phép quản lý sẽ được giữ nguyên.',
  )
  async updateRolePermissions(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpdateRolePermissionsRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.roleManageService.updateRolePermissions(
      roleId,
      dto,
      userId,
      orgId,
    );
    return new ApiResponseDto(200, 'Role permissions updated successfully');
  }

  // Lấy danh sách roles của một member cụ thể trong org
  @Get('members/:memberId')
  @RequirePermission(PERMISSIONS.RBAC.USER_ROLES.VIEW)
  @ApiParam({
    name: 'memberId',
    description: 'UUID của user cần xem roles',
    type: String,
  })
  @ApiQuery({
    name: 'scopeType',
    required: false,
    enum: ScopeType,
    description:
      'Lọc theo loại scope (không bắt buộc). Mặc định trả về tất cả.',
  })
  @ApiOperationAuto(
    'Xem roles của một member',
    'Trả về danh sách roles của một member cụ thể trong organization. ' +
      'Cần quyền rbac.user_roles.view.',
  )
  async getMemberRoles(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetOrgId() orgId: string,
    @Query('scopeType') scopeType?: ScopeType,
  ): Promise<ApiResponseDto<UserOrgRoleResponse[]>> {
    const data = await this.roleManageService.getMemberRoles(
      memberId,
      orgId,
      scopeType,
    );
    return new ApiResponseDto(200, 'Fetched member roles successfully', data);
  }

  // Gán role cho một member trong org
  @Post('members/assign')
  @RequirePermission(PERMISSIONS.RBAC.USER_ROLES.ASSIGN)
  @ApiOperationAuto(
    'Gán role cho member',
    'Gán một role cho một member trong organization. ' +
      'Không thể gán role system_admin. Không thể gán role thuộc org khác. ' +
      'Cần quyền rbac.user_roles.assign.',
  )
  async assignRoleToMember(
    @GetOrgId() orgId: string,
    @GetUser('sub') callerId: string,
    @Body() dto: AssignRoleToMemberRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.roleManageService.assignRoleToMember(dto, callerId, orgId);
    return new ApiResponseDto(200, 'Role assigned to member successfully');
  }

  // Thu hồi role khỏi một member trong org
  @Post('members/revoke')
  @RequirePermission(PERMISSIONS.RBAC.USER_ROLES.REVOKE)
  @ApiOperationAuto(
    'Thu hồi role khỏi member',
    'Thu hồi một role khỏi member trong organization. ' +
      'Không thể thu hồi role của owner tổ chức. ' +
      'Cần quyền rbac.user_roles.revoke.',
  )
  async revokeRoleFromMember(
    @GetOrgId() orgId: string,
    @Body() dto: RevokeRoleFromMemberRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.roleManageService.revokeRoleFromMember(dto, orgId);
    return new ApiResponseDto(200, 'Role revoked from member successfully');
  }
}
