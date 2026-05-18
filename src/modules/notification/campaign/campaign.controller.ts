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
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/request/create-campaign.dto';
import { GetCampaignsQueryDto } from './dto/request/get-campaigns-query.dto';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import {
  CampaignListResponse,
  CampaignResponse,
} from './dto/response/campaign.response';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { RequirePermission } from '@common/decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';

@ApiTags('Notification Campaigns')
@ApiBearerAuth('Authorization')
@UseGuards(PermissionGuard)
@Controller({ version: '1', path: 'notifications/campaigns' })
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @HttpCode(202)
  @RequirePermission(PERMISSIONS.NOTIFICATIONS.CAMPAIGNS.CREATE)
  @ApiOperationAuto(
    'Create notification campaign',
    'Broadcast to multiple recipients asynchronously and return HTTP 202 immediately.',
  )
  async createCampaign(
    @GetUser('sub') senderId: string,
    @Body() dto: CreateCampaignDto,
  ): Promise<ApiResponseDto<CampaignResponse>> {
    const data = await this.campaignService.createCampaign(senderId, dto);
    return new ApiResponseDto(202, 'Campaign accepted for processing', data);
  }

  @Get()
  @RequirePermission(PERMISSIONS.NOTIFICATIONS.CAMPAIGNS.LIST)
  @ApiOperationAuto(
    'List campaigns',
    'Retrieve notification campaigns with pagination and status filtering support.',
  )
  async findAll(
    @Query() query: GetCampaignsQueryDto,
  ): Promise<ApiResponseDto<CampaignListResponse>> {
    const data = await this.campaignService.findCampaigns(query);
    return new ApiResponseDto(200, 'Campaigns fetched successfully', data);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.NOTIFICATIONS.CAMPAIGNS.VIEW)
  @ApiParam({ name: 'id', description: 'Campaign UUID', type: String })
  @ApiOperationAuto(
    'Campaign details',
    'Retrieve the details of a notification campaign.',
  )
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<CampaignResponse>> {
    const data = await this.campaignService.findOneCampaign(id);
    return new ApiResponseDto(200, 'Campaign fetched successfully', data);
  }
}
