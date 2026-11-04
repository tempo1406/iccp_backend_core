import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { ProjectDashboardService } from './project-dashboard.service';
import { ProjectDashboardQueryRequest } from './dto/request/project-dashboard-query.request';
import { ProjectDashboardResponse } from './dto/response/project-dashboard.response';

@ApiTags('Project Dashboard')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID for tenant scoping',
  required: true,
})
@Controller({ path: 'projects/:projectId/dashboard', version: '1' })
export class ProjectDashboardController {
  constructor(private readonly dashboardService: ProjectDashboardService) {}

  @Get()
  @ApiOperationAuto(
    'Lấy dữ liệu dashboard dự án',
    'Trả về 4 card tổng quan (last 7 days), biểu đồ tròn theo status, 5 task đang hoạt động, biểu đồ cột theo priority, loại công việc, khối lượng công việc nhóm và thống kê thành viên.',
  )
  async getDashboard(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: ProjectDashboardQueryRequest,
  ): Promise<ApiResponseDto<ProjectDashboardResponse>> {
    const data = await this.dashboardService.getDashboard(
      projectId,
      orgId,
      userId,
      query.dateFrom,
      query.dateTo,
    );
    return new ApiResponseDto(200, 'Project dashboard fetched successfully', data);
  }
}
