import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { DailyReportService } from './daily-report.service';
import { DailyReportDateRequest } from './dto/request/daily-report-date.request';
import { CreateDailyReportCommentRequest } from './dto/request/create-daily-report-comment.request';
import { UpdateDailyReportRequest } from './dto/request/update-daily-report.request';
import { QueryProjectDailyReportsRequest } from './dto/request/query-project-daily-reports.request';
import { DailyReportCommentResponse } from './dto/response/daily-report-comment.response';
import { DailyReportResponse } from './dto/response/daily-report.response';

@ApiTags('Daily Reports')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'Organization ID (required)',
  required: true,
})
@Controller({ path: 'projects/:projectId/daily-reports', version: '1' })
export class DailyReportController {
  constructor(private readonly dailyReportService: DailyReportService) {}

  @Get('me')
  @ApiOperationAuto(
    'Get my project daily report',
    'Fetch your daily report for a project and date. If there is no draft yet, the system generates one from your worklogs in that project for that day.',
  )
  async getMyReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: DailyReportDateRequest,
  ): Promise<ApiResponseDto<DailyReportResponse>> {
    const data = await this.dailyReportService.getMyReport(
      projectId,
      orgId,
      userId,
      query,
    );
    return new ApiResponseDto(200, 'Fetched daily report successfully', data);
  }

  @Post('me/generate')
  @ApiOperationAuto(
    'Generate my project daily report draft',
    'Rebuild your draft daily report from worklogs in the selected project and date while preserving your note fields.',
  )
  async generateMyReportDraft(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: DailyReportDateRequest,
  ): Promise<ApiResponseDto<DailyReportResponse>> {
    const data = await this.dailyReportService.generateMyReportDraft(
      projectId,
      orgId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Generated daily report draft successfully',
      data,
    );
  }

  @Get()
  @ApiOperationAuto(
    'Get project daily reports',
    'View submitted or draft daily reports for a selected project and date. Viewing other members requires project daily report permission.',
  )
  async getProjectReports(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Query() query: QueryProjectDailyReportsRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<DailyReportResponse>>> {
    const data = await this.dailyReportService.getProjectReports(
      projectId,
      orgId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Fetched project daily reports successfully',
      data,
    );
  }

  @Put(':reportId')
  @ApiOperationAuto(
    'Update my project daily report',
    'Update summary, blockers, and next-day plan on your draft daily report for the selected project.',
  )
  async updateMyReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: UpdateDailyReportRequest,
  ): Promise<ApiResponseDto<DailyReportResponse>> {
    const data = await this.dailyReportService.updateMyReport(
      projectId,
      orgId,
      userId,
      reportId,
      dto,
    );
    return new ApiResponseDto(200, 'Updated daily report successfully', data);
  }

  @Post(':reportId/submit')
  @ApiOperationAuto(
    'Submit my project daily report',
    'Submit your draft daily report for the selected project and mark the linked worklogs as reported.',
  )
  async submitMyReport(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ): Promise<ApiResponseDto<DailyReportResponse>> {
    const data = await this.dailyReportService.submitMyReport(
      projectId,
      orgId,
      userId,
      reportId,
    );
    return new ApiResponseDto(200, 'Submitted daily report successfully', data);
  }

  @Get(':reportId/comments')
  @ApiOperationAuto(
    'Get daily report comments',
    'Fetch review comments for a daily report. The report owner or a project viewer can access this thread.',
  )
  async getReportComments(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ): Promise<ApiResponseDto<DailyReportCommentResponse[]>> {
    const data = await this.dailyReportService.getReportComments(
      projectId,
      orgId,
      userId,
      reportId,
    );
    return new ApiResponseDto(
      200,
      'Fetched daily report comments successfully',
      data,
    );
  }

  @Post(':reportId/comments')
  @ApiOperationAuto(
    'Add daily report comment',
    'Project managers or other viewers with daily report permission can add a review comment to a submitted report.',
  )
  async addReportComment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: CreateDailyReportCommentRequest,
  ): Promise<ApiResponseDto<DailyReportCommentResponse>> {
    const data = await this.dailyReportService.addReportComment(
      projectId,
      orgId,
      userId,
      reportId,
      dto,
    );
    return new ApiResponseDto(
      201,
      'Added daily report comment successfully',
      data,
    );
  }

  @Post(':reportId/mark-seen')
  @ApiOperationAuto(
    'Mark daily report as seen',
    'Project managers or other viewers with daily report permission can mark a submitted report as seen.',
  )
  async markReportSeen(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetOrgId() orgId: string,
    @GetUser('sub') userId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ): Promise<ApiResponseDto<DailyReportResponse>> {
    const data = await this.dailyReportService.markReportSeen(
      projectId,
      orgId,
      userId,
      reportId,
    );
    return new ApiResponseDto(
      200,
      'Marked daily report as seen successfully',
      data,
    );
  }
}
