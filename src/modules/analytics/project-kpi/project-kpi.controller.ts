import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { ProjectKpiService } from './project-kpi.service';
import { ProjectKpiMembersQueryRequest } from './dto/request/project-kpi-query.request';
import { ProjectKpiSelfQueryRequest } from './dto/request/project-kpi-self-query.request';
import { ProjectKpiOverviewResponse } from './dto/response/project-kpi-overview.response';
import { ProjectMemberKpiResponse } from './dto/response/project-member-kpi.response';
import { ProjectMemberKpiDetailResponse } from './dto/response/project-member-kpi-detail.response';

@ApiTags('Analytics — Project KPI')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID (required)',
  required: true,
})
@Controller({ path: 'projects/:projectId/kpi', version: '1' })
export class ProjectKpiController {
  constructor(private readonly projectKpiService: ProjectKpiService) {}

  @Get('overview')
  @ApiOperationAuto('Get project KPI overview (PM or Org Admin only)')
  async getProjectOverview(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<ProjectKpiOverviewResponse>> {
    const data = await this.projectKpiService.getProjectOverview(
      projectId,
      orgId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Fetched project KPI overview successfully',
      data,
    );
  }

  @Get('members')
  @ApiOperationAuto('Get KPI for all project members (PM or Org Admin only)')
  async getProjectMembersKpi(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: ProjectKpiMembersQueryRequest,
  ): Promise<ApiResponseDto<ProjectMemberKpiResponse[]>> {
    const data = await this.projectKpiService.getProjectMembersKpi(
      projectId,
      orgId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Fetched project members KPI successfully',
      data,
    );
  }

  @Get('me')
  @ApiOperationAuto('Get KPI detail for the current user in the project')
  async getMyProjectKpi(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: ProjectKpiSelfQueryRequest,
  ): Promise<ApiResponseDto<ProjectMemberKpiDetailResponse>> {
    const data = await this.projectKpiService.getMyProjectKpiDetail(
      projectId,
      orgId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Fetched my project KPI successfully',
      data,
    );
  }

  @Get('members/:userId')
  @ApiOperationAuto(
    'Get KPI detail for one project member',
  )
  async getProjectMemberKpiDetail(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: ProjectKpiSelfQueryRequest,
  ): Promise<ApiResponseDto<ProjectMemberKpiDetailResponse>> {
    const data = await this.projectKpiService.getProjectMemberKpiDetail(
      projectId,
      orgId,
      userId,
      targetUserId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Fetched project member KPI detail successfully',
      data,
    );
  }
}
