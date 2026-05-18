import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { ProjectMemberService } from './project-member.service';
import { ProjectMemberResponse } from './dto/response/project-member.response';
import { UpdateProjectMemberRequest } from './dto/request/update-project-member.request';
import { CreateProjectMemberInviteRequest } from './dto/request/create-project-member-invite.request';
import { ProjectInviteResponse } from '../core/dto/response/project-invite.response';

@ApiTags('Project Member')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID for tenant scoping',
  required: true,
})
@Controller({ path: 'projects/:projectId/members', version: '1' })
export class ProjectMemberController {
  constructor(private readonly projectMemberService: ProjectMemberService) {}

  @Get()
  @ApiOperationAuto(
    'Lấy danh sách thành viên dự án',
    'Lấy tất cả thành viên đang hoạt động trong dự án',
  )
  async getMembers(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseDto<ProjectMemberResponse[]>> {
    const pageValue = Number(page);
    const limitValue = Number(limit);
    const data = await this.projectMemberService.getMembers(
      projectId,
      orgId,
      userId,
      Number.isFinite(pageValue) ? pageValue : undefined,
      Number.isFinite(limitValue) ? limitValue : undefined,
    );
    return new ApiResponseDto(
      200,
      'Project members fetched successfully',
      data,
    );
  }

  @Post('invites')
  @ApiOperationAuto(
    'Mời thành viên vào dự án',
    'Gửi lời mời thành viên vào dự án. Người được mời cần accept/reject/cancel qua API project-invites',
  )
  async createMemberInvite(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateProjectMemberInviteRequest,
  ): Promise<ApiResponseDto<ProjectInviteResponse[]>> {
    const data = await this.projectMemberService.createMemberInvite(
      projectId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(
      201,
      'Project member invites created successfully',
      data,
    );
  }

  @Patch(':memberId')
  @ApiOperationAuto(
    'Cập nhật roleId thành viên',
    'Cập nhật roleId của thành viên trong dự án để tính quyền theo RBAC',
  )
  async updateMemberRole(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpdateProjectMemberRequest,
  ): Promise<ApiResponseDto<ProjectMemberResponse>> {
    const data = await this.projectMemberService.updateMemberRole(
      projectId,
      memberId,
      orgId,
      userId,
      dto,
    );
    return new ApiResponseDto(
      200,
      'Project member role updated successfully',
      data,
    );
  }

  @Delete(':memberId')
  @ApiOperationAuto(
    'Xóa thành viên khỏi dự án',
    'Xóa mềm thành viên khỏi dự án',
  )
  async removeMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.projectMemberService.removeMember(
      projectId,
      memberId,
      orgId,
      userId,
    );
    return new ApiResponseDto(200, 'Project member removed successfully');
  }
}
