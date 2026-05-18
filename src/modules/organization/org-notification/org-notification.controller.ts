import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiParam, ApiTags } from '@nestjs/swagger';
import { OrgNotificationService } from './org-notification.service';
import { CreateOrgCampaignDto } from './dto/request/create-org-campaign.dto';
import { GetOrgCampaignsQueryDto } from './dto/request/get-org-campaigns-query.dto';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import {
  CampaignListResponse,
  CampaignResponse,
} from '@modules/notification/campaign/dto/response/campaign.response';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from '../../../decorators/organization/get-org-id.decorator';
import { RequirePermission } from '@common/decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';

@ApiTags('Organization Notification Management')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  required: true,
  description: 'Organization ID',
})
@UseGuards(PermissionGuard)
@Controller({ path: 'organizations/manage/notifications', version: '1' })
export class OrgNotificationController {
  constructor(
    private readonly orgNotificationService: OrgNotificationService,
  ) {}

  @Post('campaigns')
  @HttpCode(202)
  @RequirePermission(PERMISSIONS.NOTIFICATIONS.CAMPAIGNS.CREATE)
  @ApiOperationAuto(
    'Gửi campaign đến tổ chức',
    'Org admin gửi notification đến tất cả hoặc theo role trong tổ chức; 202 Accepted.',
  )
  async sendCampaign(
    @GetUser('sub') senderId: string,
    @GetOrgId() orgId: string,
    @Body() dto: CreateOrgCampaignDto,
  ): Promise<ApiResponseDto<CampaignResponse>> {
    const data = await this.orgNotificationService.sendCampaign(
      senderId,
      orgId,
      dto,
    );
    return new ApiResponseDto(202, 'Campaign accepted for processing', data);
  }

  @Get('campaigns')
  @RequirePermission(PERMISSIONS.NOTIFICATIONS.CAMPAIGNS.LIST)
  @ApiOperationAuto(
    'Danh sách campaigns của tổ chức',
    'Lấy danh sách notification campaigns thuộc tổ chức hiện tại.',
  )
  async listCampaigns(
    @GetOrgId() orgId: string,
    @Query() query: GetOrgCampaignsQueryDto,
  ): Promise<ApiResponseDto<CampaignListResponse>> {
    const data = await this.orgNotificationService.listCampaigns(orgId, query);
    return new ApiResponseDto(200, 'Campaigns fetched successfully', data);
  }

  @Get('campaigns/:id')
  @RequirePermission(PERMISSIONS.NOTIFICATIONS.CAMPAIGNS.VIEW)
  @ApiParam({ name: 'id', description: 'UUID của campaign', type: String })
  @ApiOperationAuto(
    'Chi tiết campaign của tổ chức',
    'Lấy chi tiết campaign, validate thuộc tổ chức hiện tại.',
  )
  async getCampaign(
    @GetOrgId() orgId: string,
    @Param('id') campaignId: string,
  ): Promise<ApiResponseDto<CampaignResponse>> {
    const data = await this.orgNotificationService.getCampaign(
      orgId,
      campaignId,
    );
    return new ApiResponseDto(200, 'Campaign fetched successfully', data);
  }
}
