import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { OrgKpiService } from './org-kpi.service';
import { OrgKpiMembersQueryRequest } from './dto/request/org-kpi-query.request';
import { OrgKpiOverviewResponse } from './dto/response/org-kpi-overview.response';
import { OrgMemberKpiResponse } from './dto/response/org-member-kpi.response';
import { OrgMemberKpiDetailResponse } from './dto/response/org-member-kpi-detail.response';

@ApiTags('Analytics — Org KPI')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID (required)',
  required: true,
})
@Controller({ path: 'org-kpi', version: '1' })
export class OrgKpiController {
  constructor(private readonly orgKpiService: OrgKpiService) {}

  @Get('overview')
  @RequirePermission(PERMISSIONS.ANALYTICS.KPI.VIEW_ORG)
  @ApiOperationAuto('Get organization-wide KPI overview')
  async getOrgOverview(
    @GetOrgId() orgId: string,
  ): Promise<ApiResponseDto<OrgKpiOverviewResponse>> {
    const data = await this.orgKpiService.getOrgOverview(orgId);
    return new ApiResponseDto(
      200,
      'Fetched org KPI overview successfully',
      data,
    );
  }

  @Get('members')
  @RequirePermission(PERMISSIONS.ANALYTICS.KPI.VIEW_ORG)
  @ApiOperationAuto('Get KPI summary for all org members (paginated)')
  async getOrgMembersKpi(
    @GetOrgId() orgId: string,
    @GetUser('sub') currentUserId: string,
    @Query() query: OrgKpiMembersQueryRequest,
  ): Promise<
    ApiResponseDto<{
      data: OrgMemberKpiResponse[];
      meta: { total: number; page: number; limit: number };
    }>
  > {
    const data = await this.orgKpiService.getOrgMembersKpi(
      orgId,
      currentUserId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Fetched org members KPI successfully',
      data,
    );
  }

  @Get('members/:userId')
  @ApiOperationAuto('Get KPI detail for one org member (self or Org Admin)')
  async getOrgMemberKpiDetail(
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') requesterId: string,
  ): Promise<ApiResponseDto<OrgMemberKpiDetailResponse>> {
    const data = await this.orgKpiService.getOrgMemberKpiDetail(
      orgId,
      requesterId,
      targetUserId,
    );
    return new ApiResponseDto(
      200,
      'Fetched org member KPI detail successfully',
      data,
    );
  }
}
