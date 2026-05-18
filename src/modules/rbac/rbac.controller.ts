import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RbacService } from './rbac.service';
import { ApiBearerAuth, ApiHeader, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { RequirePermission } from '@common/decorators/role/require-permission.decorator';
import { AssignPermissionRequest } from './dto/request/assign-permission.request';
import { CreateSystemOrgRoleRequest } from './dto/request/create-org-role.request';
import { CreateSystemRoleRequest } from './dto/request/create-system-role.request';
import { PermissionResponse } from './dto/response/permission.response';
import { MyPermissionsResponse } from './dto/response/my-permissions.response';
import { MyRolePermissionsResponse } from './dto/response/my-role-permissions.response';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { RolesGuard } from '@guards/rbac-guard/roles.guard';
import { Roles } from '@common/decorators/role/role.decorator';
import { PERMISSIONS, SYSTEM_ROLES } from './constant/permission.constant';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { SyncPermissionRequest } from './dto/request/sync-permission.request';

const X_ORG_ID = 'x-organization-id';

@ApiTags('RBAC')
@ApiBearerAuth('Authorization')
@Controller({ path: 'rbac', version: '1' })
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // Role: Tạo org dành cho những user có quyền rbac.roles.create
  @Post('roles/org')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.RBAC.ROLES.CREATE)
  @ApiHeader({
    name: X_ORG_ID,
    description: 'ID của organization',
    required: true,
  })
  @ApiOperationAuto(
    'Tạo org role',
    'Tạo role trong một organization cụ thể. ' +
      'Caller phải có quyền rbac.roles.create trong org đó (header X-Organization-Id bắt buộc). ' +
      'Không thể tạo system role qua endpoint này.',
  )
  async createOrgRole(
    @Body() dto: CreateSystemOrgRoleRequest,
    @GetUser('sub') userId: string,
    @Headers(X_ORG_ID) organizationId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.rbacService.createOrgRole(dto, userId, organizationId);
    return new ApiResponseDto(200, 'Org role created successfully');
  }

  // Role: Tạo system role (chỉ system_admin)
  @Post('roles/system')
  @UseGuards(RolesGuard)
  @Roles(SYSTEM_ROLES.SYSTEM_ADMIN)
  @ApiOperationAuto(
    'Tạo system role',
    'Tạo một role cấp hệ thống (không gắn với org). Chỉ system_admin được phép. ' +
      'Nếu tên role đã tồn tại ở system scope thì request sẽ bị từ chối.',
  )
  async createSystemRole(
    @GetUser('sub') userId: string,
    @Body() dto: CreateSystemRoleRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.rbacService.createSystemRole(dto, userId);
    return new ApiResponseDto(200, 'System role created successfully');
  }

  // Role: Gán permissions vào role
  @Post('roles/permissions')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.RBAC.ROLES.ASSIGN_PERMISSIONS)
  @ApiHeader({
    name: X_ORG_ID,
    description: 'ID của organization (nếu là org role)',
    required: false,
  })
  @ApiOperationAuto(
    'Gán permissions vào role',
    'Gán một hoặc nhiều permissions vào một role. ' +
      'Caller không thể gán permission mà mình không có (anti privilege escalation). ' +
      'Không thể gán permission vào system role qua endpoint này.',
  )
  async assignPermissions(
    @Body() dto: AssignPermissionRequest,
    @GetUser('sub') userId: string,
    @Headers(X_ORG_ID) organizationId?: string,
  ): Promise<ApiResponseDto<void>> {
    await this.rbacService.assignPermissionsToRole(dto, userId, organizationId);
    return new ApiResponseDto(200, 'Permissions assigned successfully');
  }

  // Role: Xoá role
  @Delete('roles/:roleId')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.RBAC.ROLES.DELETE)
  @ApiParam({
    name: 'roleId',
    description: 'UUID của role cần xoá',
    type: String,
  })
  @ApiOperationAuto(
    'Xoá role',
    'Xoá một role. Không thể xoá system_admin.',
  )
  async deleteRole(
    @Param('roleId') roleId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.rbacService.deleteRole(roleId);
    return new ApiResponseDto(200, 'Role deleted successfully');
  }

  // Permission: Lấy tất cả (system_admin only)
  @Get('permissions')
  @UseGuards(RolesGuard)
  @Roles(SYSTEM_ROLES.SYSTEM_ADMIN)
  @ApiOperationAuto(
    'Lấy tất cả permissions',
    'Trả về toàn bộ danh sách permissions trong hệ thống. Chỉ system_admin được phép.',
  )
  async getAllPermissions(): Promise<ApiResponseDto<PermissionResponse[]>> {
    const permissions = await this.rbacService.getAllPermissions();
    return new ApiResponseDto(
      200,
      'Get all permissions successfully',
      permissions,
    );
  }

  // Permission: Lấy permissions của user đang auth
  @Get('permissions/me')
  @ApiHeader({
    name: X_ORG_ID,
    description: 'ID tổ chức để lấy permissions trong tổ chức đó (optional)',
    required: false,
  })
  @ApiOperationAuto(
    'Lấy permissions của tôi',
    'Trả về danh sách permissions của người dùng đang đăng nhập. ' +
      'Nếu có header X-Organization-Id, trả về permissions trong org đó. ' +
      'Nếu không, trả về system-level permissions.',
  )
  async getMyPermissions(
    @GetUser('sub') userId: string,
    @Headers(X_ORG_ID) organizationId?: string,
  ): Promise<ApiResponseDto<MyPermissionsResponse>> {
    const permissions = await this.rbacService.getMyPermissions(
      userId,
      organizationId,
    );
    return new ApiResponseDto(
      200,
      'Get my permissions successfully',
      permissions,
    );
  }

  @Post('permissions/sync')
  @UseGuards(RolesGuard)
  @Roles(SYSTEM_ROLES.SYSTEM_ADMIN)
  @ApiOperationAuto(
    'Sync permissions',
    'Đồng bộ permissions từ constant vào DB rồi gán vào system roles. ' +
      'permissionCodes = [] → sync toàn bộ permissions. ' +
      'systemRoles = [] → gán cho toàn bộ system roles (system_admin, org_admin, user).',
  )
  async syncPermissions(
    @Body() dto: SyncPermissionRequest,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<{ created: number; assigned: number }>> {
    const result = await this.rbacService.syncPermissions(dto, userId);
    return new ApiResponseDto(
      200,
      `Synced: ${result.created} permissions created, ${result.assigned} role-permission records upserted`,
      result,
    );
  }

  @Get('me')
  @ApiHeader({
    name: X_ORG_ID,
    description:
      'ID tổ chức để lấy roles/permissions trong org đó. Không truyền → chỉ lấy system-level roles.',
    required: false,
  })
  @ApiOperationAuto(
    'Lấy roles + permissions của tôi',
    'Trả về danh sách roles và toàn bộ permissions (đã deduplicate) của user đang đăng nhập. ' +
      'Nếu truyền X-Organization-Id → lấy roles trong org đó. ' +
      'Nếu không → chỉ lấy system-level roles (organizationId IS NULL).',
  )
  async getMyRoleAndPermissions(
    @GetUser('sub') userId: string,
    @Headers(X_ORG_ID) organizationId?: string,
  ): Promise<ApiResponseDto<MyRolePermissionsResponse>> {
    const data = await this.rbacService.getMyRoleAndPermissions(
      userId,
      organizationId,
    );
    return new ApiResponseDto(
      200,
      'Get my roles and permissions successfully',
      data,
    );
  }
}
