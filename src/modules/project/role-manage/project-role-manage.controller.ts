import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { GetProjectId } from 'src/decorators/project/get-project-id.decorator';
import { ProjectRoleManageService } from './project-role-manage.service';
import { CreateProjectRoleRequest } from './dto/request/create-project-role.request';
import { UpdateProjectRoleRequest } from './dto/request/update-project-role.request';
import { AssignPermissionsToProjectRoleRequest } from './dto/request/assign-permissions.request';
import { RevokePermissionsFromProjectRoleRequest } from './dto/request/revoke-permissions.request';
import { AssignRoleToProjectMemberRequest } from './dto/request/assign-role-to-member.request';
import { RevokeRoleFromProjectMemberRequest } from './dto/request/revoke-role-from-member.request';
import { ProjectRoleResponse } from './dto/response/project-role.response';
import { ProjectRoleDetailResponse } from './dto/response/project-role-detail.response';
import { ProjectMemberRoleResponse } from './dto/response/project-member-role.response';

@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID',
  required: true,
})
@ApiParam({
  name: 'projectId',
  description: 'Project ID',
  type: String,
})
@Controller({ path: 'projects/:projectId/roles', version: '1' })
@ApiBearerAuth('Authorization')
@ApiTags('Project Role Management')
export class ProjectRoleManageController {
  constructor(
    private readonly projectRoleManageService: ProjectRoleManageService,
  ) {}

  @Get('me')
  @ApiOperationAuto(
    'Lấy role của tôi trong project',
    'Trả về danh sách role của user đang đăng nhập trong project scope.',
  )
  async getMyRoles(
    @GetUser('sub') userId: string,
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<ProjectMemberRoleResponse[]>> {
    const data = await this.projectRoleManageService.getMyRoles(
      userId,
      projectId,
      orgId,
    );
    return new ApiResponseDto(200, 'Fetched my project roles successfully', data);
  }

  @Post()
  @ApiOperationAuto(
    'Tạo role trong project',
    'Tạo role mới cho project. Có thể gán permission ngay khi tạo. Cần quyền projects.roles.create trong project.',
  )
  async createRole(
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateProjectRoleRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.projectRoleManageService.createRole(dto, userId, projectId, orgId);
    return new ApiResponseDto(201, 'Project role created successfully');
  }

  @Get()
  @ApiOperationAuto(
    'Lấy danh sách role trong project',
    'Lấy danh sách role có thể dùng trong project (roles trong cùng organization). Cần quyền projects.roles.list.',
  )
  async getRoles(
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<ProjectRoleResponse[]>> {
    const data = await this.projectRoleManageService.getRoles(
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Fetched project roles successfully', data);
  }

  @Get('available-permissions')
  @ApiOperationAuto(
    'Lấy danh sách permission có thể gán cho role project',
    'Trả về các permission thuộc module projects để sử dụng cho role-management trong project.',
  )
  async getAvailablePermissions(
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<{ code: string; name: string; module: string }[]>> {
    const data = await this.projectRoleManageService.getAvailablePermissions(
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Fetched available project permissions successfully',
      data,
    );
  }

  @Get(':roleId')
  @ApiParam({ name: 'roleId', description: 'Role ID', type: String })
  @ApiOperationAuto(
    'Lấy chi tiết role trong project',
    'Lấy thông tin role và danh sách permissions của role. Cần quyền projects.roles.view.',
  )
  async getRoleDetail(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<ProjectRoleDetailResponse>> {
    const data = await this.projectRoleManageService.getRoleDetail(
      roleId,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Fetched project role detail successfully', data);
  }

  @Put(':roleId')
  @ApiParam({ name: 'roleId', description: 'Role ID', type: String })
  @ApiOperationAuto(
    'Cập nhật role trong project',
    'Cập nhật tên/mô tả role. Không cho sửa system role. Cần quyền projects.roles.update.',
  )
  async updateRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpdateProjectRoleRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.projectRoleManageService.updateRole(
      roleId,
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Project role updated successfully');
  }

  @Delete(':roleId')
  @ApiParam({ name: 'roleId', description: 'Role ID', type: String })
  @ApiOperationAuto(
    'Xóa role trong project',
    'Xóa role khỏi organization context của project. Không cho xóa system role. Cần quyền projects.roles.delete.',
  )
  async deleteRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.projectRoleManageService.deleteRole(
      roleId,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Project role deleted successfully');
  }

  @Post('permissions/assign')
  @ApiOperationAuto(
    'Gán permissions cho role project',
    'Gán các permission code vào role. Có anti-privilege-escalation: caller không thể gán permission mình không có.',
  )
  async assignPermissions(
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: AssignPermissionsToProjectRoleRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.projectRoleManageService.assignPermissions(
      dto,
      userId,
      projectId,
      orgId,
    );
    return new ApiResponseDto(
      200,
      'Permissions assigned to project role successfully',
    );
  }

  @Post('permissions/revoke')
  @ApiOperationAuto(
    'Thu hồi permissions khỏi role project',
    'Thu hồi các permission code khỏi role. Có anti-privilege-escalation tương tự endpoint assign permissions.',
  )
  async revokePermissions(
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: RevokePermissionsFromProjectRoleRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.projectRoleManageService.revokePermissions(
      dto,
      userId,
      projectId,
      orgId,
    );
    return new ApiResponseDto(
      200,
      'Permissions revoked from project role successfully',
    );
  }

  @Get('members/:memberId')
  @ApiParam({ name: 'memberId', description: 'User ID', type: String })
  @ApiOperationAuto(
    'Lấy role của 1 member trong project',
    'Trả về danh sách role của member cụ thể trong project scope. Cần quyền projects.roles.view.',
  )
  async getMemberRoles(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<ProjectMemberRoleResponse[]>> {
    const data = await this.projectRoleManageService.getMemberRoles(
      memberId,
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Fetched project member roles successfully', data);
  }

  @Post('members/assign')
  @ApiOperationAuto(
    'Gán role cho member trong project',
    'Gán 1 role cho member trong project. Không cho self-assign và không cho gán system_admin qua endpoint này.',
  )
  async assignRoleToMember(
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') callerId: string,
    @Body() dto: AssignRoleToProjectMemberRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.projectRoleManageService.assignRoleToMember(
      dto,
      callerId,
      projectId,
      orgId,
    );
    return new ApiResponseDto(200, 'Role assigned to project member successfully');
  }

  @Post('members/revoke')
  @ApiOperationAuto(
    'Thu hồi role của member trong project',
    'Thu hồi 1 role project-scope đã gán cho member. Cần quyền projects.roles.revoke_from_member.',
  )
  async revokeRoleFromMember(
    @GetProjectId() projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') callerId: string,
    @Body() dto: RevokeRoleFromProjectMemberRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.projectRoleManageService.revokeRoleFromMember(
      dto,
      projectId,
      orgId,
      callerId,
    );
    return new ApiResponseDto(200, 'Role revoked from project member successfully');
  }
}
