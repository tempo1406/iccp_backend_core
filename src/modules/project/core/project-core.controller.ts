import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { ProjectCoreService } from './project-core.service';
import { CreateProjectRequest } from './dto/request/create-project.request';
import { UpdateProjectRequest } from './dto/request/update-project.request';
import { CreateProjectInviteRequest } from './dto/request/create-project-invite.request';
import { AcceptProjectInviteRequest } from './dto/request/accept-project-invite.request';
import { ProjectResponse } from './dto/response/project.response';
import { ProjectInviteResponse } from './dto/response/project-invite.response';
import { ProjectInviteStatus } from './entities/project-invite.entity';

@ApiTags('Project Core')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID for tenant scoping',
  required: true,
})
@Controller({ path: '', version: '1' })
export class ProjectCoreController {
  constructor(private readonly projectService: ProjectCoreService) {}

  @Post('projects')
  @ApiOperationAuto(
    'Tạo project',
    'Tạo project mới trong organization. Nếu không truyền managerId thì project chưa có manager. managerId có thể là 1 UUID hoặc mảng UUID.',
  )
  async createProject(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateProjectRequest,
  ): Promise<ApiResponseDto<ProjectResponse>> {
    const data = await this.projectService.createProject(orgId, userId, dto);
    return new ApiResponseDto(201, 'Project created successfully', data);
  }

  @Get('projects')
  @ApiOperationAuto(
    'Lấy danh sách project',
    'Lấy danh sách project theo x-organization-id. Nếu user có quyền org-scope projects.list thì thấy tất cả, nếu không sẽ chỉ thấy project liên quan (creator/manager/member).',
  )
  async getProjects(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseDto<ProjectResponse[]>> {
    const pageValue = Number(page);
    const limitValue = Number(limit);
    const data = await this.projectService.getProjects(
      orgId,
      userId,
      Number.isFinite(pageValue) ? pageValue : undefined,
      Number.isFinite(limitValue) ? limitValue : undefined,
    );
    return new ApiResponseDto(200, 'Projects fetched successfully', data);
  }

  @Get('projects/:slug')
  @ApiOperationAuto(
    'Lấy chi tiết project',
    'Lấy chi tiết 1 project theo project id hoặc slug. Cho phép khi user là creator/manager hoặc có quyền projects.view trong project scope.',
  )
  async getProject(
    @Param('slug') slug: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<ProjectResponse>> {
    const data = await this.projectService.getProject(slug, orgId, userId);
    return new ApiResponseDto(200, 'Project fetched successfully', data);
  }

  @Put('projects/:projectId')
  @ApiOperationAuto(
    'Cập nhật project',
    'Cập nhật thông tin project. Cho phép khi user là creator/manager hoặc có quyền projects.update. managerId có thể là 1 UUID hoặc mảng UUID.',
  )
  async updateProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpdateProjectRequest,
  ): Promise<ApiResponseDto<ProjectResponse>> {
    const data = await this.projectService.updateProject(
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Project updated successfully', data);
  }

  @Delete('projects/:projectId')
  @ApiOperationAuto(
    'Xóa project',
    'Xóa project và dữ liệu liên quan theo transaction: tasks, project_members, user_roles ở project scope, sau đó mới xóa project.',
  )
  async deleteProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.projectService.deleteProject(projectId, orgId, userId);
    return new ApiResponseDto(200, 'Project deleted successfully');
  }

  @Post('projects/:projectId/invites')
  @ApiOperationAuto(
    'Tạo lời mời PM vào project',
    'Mời một hoặc nhiều user làm PM của project',
  )
  async createInvite(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateProjectInviteRequest,
  ): Promise<ApiResponseDto<ProjectInviteResponse[]>> {
    const data = await this.projectService.createProjectInvite(
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(
      201,
      'Project invites created successfully',
      data,
    );
  }

  @Get('project-invites/me')
  @ApiOperationAuto(
    'Lấy danh sách lời mời của tôi',
    'Invitee lấy danh sách lời mời theo organization hiện tại, có thể lọc theo status',
  )
  async getMyInvites(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query(
      'status',
      new ParseEnumPipe(ProjectInviteStatus, {
        optional: true,
      }),
    )
    status?: ProjectInviteStatus,
  ): Promise<ApiResponseDto<ProjectInviteResponse[]>> {
    const data = await this.projectService.getMyProjectInvites(
      orgId,
      userId,
      status,
    );
    return new ApiResponseDto(
      200,
      'Project invites fetched successfully',
      data,
    );
  }

  @Post('project-invites/accept')
  @ApiOperationAuto(
    'Chấp nhận lời mời project bằng token',
    'Invitee chấp nhận lời mời project thông qua token nhận trong email',
  )
  async acceptInviteByToken(
    @GetUser('sub') userId: string,
    @Body() dto: AcceptProjectInviteRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.projectService.acceptProjectInviteByToken(dto.token, userId);
    return new ApiResponseDto(200, 'Project invite accepted');
  }

  @Post('project-invites/:inviteId/reject')
  @ApiOperationAuto(
    'Từ chối lời mời project (Bên nhận từ chối)',
    'Từ chối lời mời vào project',
  )
  async rejectInvite(
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.projectService.rejectProjectInvite(inviteId, orgId, userId);
    return new ApiResponseDto(200, 'Project invite rejected');
  }

  @Post('project-invites/:inviteId/cancel')
  @ApiOperationAuto(
    'Hủy lời mời project (Bên gửi rút lại)',
    'Hủy lời mời đang ở trạng thái pending',
  )
  async cancelInvite(
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.projectService.cancelProjectInvite(inviteId, orgId, userId);
    return new ApiResponseDto(200, 'Project invite canceled');
  }
}
