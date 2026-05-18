import { plainToInstance } from 'class-transformer';
import {
  CampaignStatus,
  NotificationCampaign,
  TargetType,
} from '../../entities/notification-campaign.entity';

export class CampaignResponse {
  id: string;
  senderId: string;
  title: string;
  message: string;
  content: string;
  type: string;
  targetType: TargetType;
  targetOrgId: string | null;
  targetRoleIds: string[] | null;
  targetUserIds: string[] | null;
  sendEmail: boolean;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;

  static fromEntity(entity: NotificationCampaign): CampaignResponse {
    return plainToInstance(CampaignResponse, {
      id: entity.id,
      senderId: entity.senderId,
      title: entity.title,
      message: entity.message,
      content: entity.content,
      type: entity.type,
      targetType: entity.targetType,
      targetOrgId: entity.targetOrgId ?? null,
      targetRoleIds: entity.targetRoleIds ?? null,
      targetUserIds: entity.targetUserIds ?? null,
      sendEmail: entity.sendEmail,
      status: entity.status,
      totalRecipients: entity.totalRecipients,
      sentCount: entity.sentCount,
      failedCount: entity.failedCount,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    });
  }
}

export class CampaignListResponse {
  data: CampaignResponse[];
  total: number;
}
