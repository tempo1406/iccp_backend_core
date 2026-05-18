import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { DispatchPeriodicReportRequest } from './dto/request/dispatch-periodic-report.request';
import { PeriodicReportHistoryRequest } from './dto/request/periodic-report-history.request';
import {
  PeriodicReportHistoryDetailResponse,
  PeriodicReportHistoryItemResponse,
} from './dto/response/periodic-report-history.response';
import { PeriodicReportService } from './application/periodic-report.service';

@ApiTags('Analytics — Periodic Reports')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID (required)',
  required: true,
})
@Controller({ path: 'analytics/reports/periodic', version: '1' })
export class PeriodicReportController {
  constructor(
    private readonly periodicReportService: PeriodicReportService,
  ) {}

  @Post('dispatch')
  @RequirePermission(PERMISSIONS.ANALYTICS.REPORTS.SEND)
  @ApiOperationAuto('Dispatch periodic report manually')
  async dispatch(
    @GetOrgId() organizationId: string,
    @GetUser('sub') currentUserId: string,
    @Body() dto: DispatchPeriodicReportRequest,
  ): Promise<ApiResponseDto<PeriodicReportHistoryDetailResponse>> {
    const data = await this.periodicReportService.dispatchManually(
      organizationId,
      dto,
      currentUserId,
    );
    return new ApiResponseDto(
      200,
      'Periodic report dispatched successfully',
      data,
    );
  }

  @Get('history')
  @RequirePermission(PERMISSIONS.ANALYTICS.REPORTS.VIEW)
  @ApiOperationAuto('Get periodic report history')
  async getHistory(
    @GetOrgId() organizationId: string,
    @GetUser('sub') currentUserId: string,
    @Query() query: PeriodicReportHistoryRequest,
  ): Promise<
    ApiResponseDto<PaginatedResponse<PeriodicReportHistoryItemResponse>>
  > {
    const data = await this.periodicReportService.getHistory(
      organizationId,
      query,
      currentUserId,
    );
    return new ApiResponseDto(
      200,
      'Fetched periodic report history successfully',
      data,
    );
  }

  @Get('history/:runId')
  @RequirePermission(PERMISSIONS.ANALYTICS.REPORTS.VIEW)
  @ApiOperationAuto('Get periodic report history detail')
  async getHistoryDetail(
    @GetOrgId() organizationId: string,
    @GetUser('sub') currentUserId: string,
    @Param('runId', ParseUUIDPipe) runId: string,
  ): Promise<ApiResponseDto<PeriodicReportHistoryDetailResponse>> {
    const data = await this.periodicReportService.getHistoryDetail(
      organizationId,
      runId,
      currentUserId,
    );
    return new ApiResponseDto(
      200,
      'Fetched periodic report history detail successfully',
      data,
    );
  }
}
