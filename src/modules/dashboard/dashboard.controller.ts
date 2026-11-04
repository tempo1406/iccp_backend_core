import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { DashboardService } from './dashboard.service';
import { TenantDashboardResponse } from './dto/response/tenant-dashboard.response';
import { GetDashboardOverviewQueryDto } from './dto/request/get-dashboard-overview.query';

@ApiTags('Tenant Dashboard')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID for tenant scoping',
  required: true,
})
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperationAuto(
    'Get tenant dashboard overview',
    'Returns a role-adaptive dashboard payload for org admins and regular members.',
  )
  async getOverview(
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: GetDashboardOverviewQueryDto,
  ): Promise<ApiResponseDto<TenantDashboardResponse>> {
    const data = await this.dashboardService.getOverview(orgId, userId, query);
    return new ApiResponseDto(200, 'Tenant dashboard fetched successfully', data);
  }
}
