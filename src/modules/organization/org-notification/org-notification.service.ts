import { Injectable } from '@nestjs/common';
import { CampaignService } from '@modules/notification/campaign/campaign.service';
import { TargetType } from '@modules/notification/campaign/entities/notification-campaign.entity';
import {
  CampaignListResponse,
  CampaignResponse,
} from '@modules/notification/campaign/dto/response/campaign.response';
import { CreateOrgCampaignDto } from './dto/request/create-org-campaign.dto';
import { GetOrgCampaignsQueryDto } from './dto/request/get-org-campaigns-query.dto';

@Injectable()
export class OrgNotificationService {
  constructor(private readonly campaignService: CampaignService) {}

  async sendCampaign(
    senderId: string,
    orgId: string,
    dto: CreateOrgCampaignDto,
  ): Promise<CampaignResponse> {
    return this.campaignService.createCampaign(senderId, {
      title: dto.title,
      message: dto.message,
      content: dto.content,
      type: dto.type,
      targetType: dto.targetType as unknown as TargetType,
      targetOrgId: orgId, // auto-set from header
      targetRoleIds: dto.targetRoleIds,
      targetUserIds: dto.targetUserIds,
      sendEmail: dto.sendEmail,
    });
  }

  async listCampaigns(
    orgId: string,
    query: GetOrgCampaignsQueryDto,
  ): Promise<CampaignListResponse> {
    return this.campaignService.findCampaigns({ ...query, orgId });
  }

  async getCampaign(
    orgId: string,
    campaignId: string,
  ): Promise<CampaignResponse> {
    return this.campaignService.findOneCampaign(campaignId, orgId);
  }
}
