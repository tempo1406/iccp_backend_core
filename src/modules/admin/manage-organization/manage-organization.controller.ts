import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ManageOrganizationService } from './manage-organization.service';
import { OrgListItemResponse } from './dto/response/org-list-item.response';
import { OrgDetailAdminResponse } from './dto/response/org-detail-admin.response';
import { SystemRoleAdminResponse } from './dto/response/system-role-admin.response';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { Roles } from '@decorators/role/role.decorator';
import { RolesGuard } from '@guards/rbac-guard/roles.guard';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { SystemRole } from '@common/enums/system-role.enum';
import { UpdateSystemRoleRequest } from './dto/request/update-system-role.request';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { GetSystemRolesQueryRequest } from './dto/request/get-system-roles-query.request';

@ApiTags('Admin – Organizations')
@ApiBearerAuth('Authorization')
@Controller({ path: 'admin/organizations', version: '1' })
@UseGuards(RolesGuard, PermissionGuard)
@Roles(SystemRole.SYSTEM_ADMIN)
export class ManageOrganizationController {
  constructor(
    private readonly manageOrganizationService: ManageOrganizationService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.LIST)
  @ApiOperation({
    summary:
      '[SYSTEM_ADMIN] Lấy danh sách tất cả Organization (kèm số thành viên, owner, plan, billing)',
  })
  async getAllOrgs(): Promise<ApiResponseDto<OrgListItemResponse[]>> {
    const data = await this.manageOrganizationService.getAllOrgs();
    return new ApiResponseDto(
      200,
      'Fetched all organizations successfully',
      data,
    );
  }

  @Get('system-roles')
  @RequirePermission(PERMISSIONS.RBAC.ROLES.LIST)
  @ApiOperation({
    summary:
      '[SYSTEM_ADMIN] Get global system roles where isSystemRole = true',
  })
  async getSystemRoles(
    @Query() query: GetSystemRolesQueryRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<SystemRoleAdminResponse>>> {
    const data = await this.manageOrganizationService.getSystemRoles(query);
    return new ApiResponseDto(200, 'Fetched system roles successfully', data);
  }

  @Put('system-roles/:roleId')
  @RequirePermission(PERMISSIONS.RBAC.ROLES.UPDATE)
  @ApiOperation({
    summary:
      '[SYSTEM_ADMIN] Update system role (name/description/permissionCodes)',
  })
  async updateSystemRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateSystemRoleRequest,
  ): Promise<ApiResponseDto<SystemRoleAdminResponse>> {
    const data = await this.manageOrganizationService.updateSystemRole(
      roleId,
      dto,
    );
    return new ApiResponseDto(200, 'System role updated successfully', data);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.TENANT.ORGANIZATIONS.VIEW)
  @ApiOperation({
    summary:
      '[SYSTEM_ADMIN] Lấy chi tiết Organization (kèm full plan info, billing, owner)',
  })
  async getOrgDetail(
    @Param('id', ParseUUIDPipe) orgId: string,
  ): Promise<ApiResponseDto<OrgDetailAdminResponse>> {
    const data = await this.manageOrganizationService.getOrgDetail(orgId);
    return new ApiResponseDto(
      200,
      'Fetched organization detail successfully',
      data,
    );
  }
}
