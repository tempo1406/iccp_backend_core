import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CampaignQueueService } from '@modules/bull/queues/notification/campaign/campaign.queue.service';
import {
  CampaignStatus,
  NotificationCampaign,
  TargetType,
} from './entities/notification-campaign.entity';
import { CreateCampaignDto } from './dto/request/create-campaign.dto';
import { GetCampaignsQueryDto } from './dto/request/get-campaigns-query.dto';
import {
  CampaignListResponse,
  CampaignResponse,
} from './dto/response/campaign.response';
import { NotificationCoreService } from '../core/notification-core.service';
import { MaillerService } from '@modules/mail/mail.service';
import { WebsocketService } from '@modules/websocket/websocket.service';
import { WsEvents } from '@modules/websocket/types';
import { CampaignStatus as WsCampaignStatus } from '@modules/websocket/types/notification/campaign-progress.ws';
import { CampaignProcessEvent } from '../core/constants/notification-events.constant';
import { User } from '@modules/users/entities/user.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { UserRole } from '@modules/rbac/entities/user-role.entity';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectRepository(NotificationCampaign)
    private readonly campaignRepo: Repository<NotificationCampaign>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    private readonly notificationCoreService: NotificationCoreService,
    private readonly mailService: MaillerService,
    private readonly websocketService: WebsocketService,
    private readonly campaignQueueService: CampaignQueueService,
  ) {}

  async createCampaign(
    senderId: string,
    dto: CreateCampaignDto,
  ): Promise<CampaignResponse> {
    // Validate targeting
    if (
      (dto.targetType === TargetType.ORG_ALL ||
        dto.targetType === TargetType.ORG_ROLE) &&
      !dto.targetOrgId
    ) {
      throw new ValidationException(
        ErrorCode.N002,
        'targetOrgId is required for ORG_ALL and ORG_ROLE target types',
      );
    }

    if (dto.targetType === TargetType.ORG_ROLE && !dto.targetRoleIds?.length) {
      throw new ValidationException(
        ErrorCode.N003,
        'targetRoleIds is required for ORG_ROLE target type',
      );
    }

    if (
      dto.targetType === TargetType.SPECIFIC_USERS &&
      !dto.targetUserIds?.length
    ) {
      throw new ValidationException(
        ErrorCode.N004,
        'targetUserIds is required for SPECIFIC_USERS target type',
      );
    }

    // Resolve recipient IDs
    let recipientIds: string[] = [];

    if (dto.targetType === TargetType.SPECIFIC_USERS) {
      recipientIds = dto.targetUserIds!;
    } else if (dto.targetType === TargetType.ORG_ALL) {
      const members = await this.memberRepo.find({
        where: { organizationId: dto.targetOrgId!, isActive: true },
      });
      recipientIds = members.map((m) => m.userId);
    } else if (dto.targetType === TargetType.ORG_ROLE) {
      const userRoles = await this.userRoleRepo.find({
        where: {
          organizationId: dto.targetOrgId!,
          roleId: In(dto.targetRoleIds!),
        },
      });
      recipientIds = [...new Set(userRoles.map((ur) => ur.userId))];
    }

    // Exclude sender from recipients
    recipientIds = recipientIds.filter((id) => id !== senderId);

    // Save campaign — content (may contain base64 images) stays in DB only
    const campaign = await this.campaignRepo.save(
      this.campaignRepo.create({
        senderId,
        title: dto.title,
        message: dto.message,
        content: dto.content,
        type: dto.type ?? 'info',
        targetType: dto.targetType,
        targetOrgId: dto.targetOrgId ?? null,
        targetRoleIds: dto.targetRoleIds ?? null,
        targetUserIds: dto.targetUserIds ?? null,
        sendEmail: dto.sendEmail ?? false,
        status: CampaignStatus.PENDING,
        totalRecipients: recipientIds.length,
      }),
    );

    // Enqueue only lightweight identifiers — content stays in DB, not in job payload.
    const processEvent: CampaignProcessEvent = {
      campaignId: campaign.id,
      recipientIds,
    };
    await this.campaignQueueService.enqueue(
      processEvent as CampaignProcessEvent & Record<string, unknown>,
    );

    return CampaignResponse.fromEntity(campaign);
  }

  async processCampaignBatch(event: CampaignProcessEvent): Promise<void> {
    const { campaignId, recipientIds } = event;

    // Fetch full campaign data (including content) from DB — keeps event payload slim
    const campaign = await this.campaignRepo.findOneBy({ id: campaignId });
    if (!campaign) {
      this.logger.error(`Campaign ${campaignId} not found during processing`);
      return;
    }

    const { title, message, content, type, sendEmail, senderId } = campaign;

    // Fetch sender info for denormalization
    const sender = await this.userRepo.findOneBy({ id: senderId });
    const senderName =
      [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') ||
      sender?.email ||
      'Unknown';
    const senderAvatarUrl = sender?.avatarUrl ?? undefined;

    await this.campaignRepo.update(campaignId, {
      status: CampaignStatus.PROCESSING,
    });

    const chunkSize = 50;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < recipientIds.length; i += chunkSize) {
      const chunk = recipientIds.slice(i, i + chunkSize);
      let deltaSent = 0;
      let deltaFailed = 0;

      await new Promise<void>((resolve) => {
        setImmediate(() => {
          const processChunk = async () => {
            for (const userId of chunk) {
              try {
                await this.notificationCoreService.sendForCampaign({
                  userId,
                  campaignId,
                  title,
                  message,
                  content,
                  type,
                  senderId,
                  senderName,
                  senderAvatarUrl,
                });

                if (sendEmail) {
                  const user = await this.userRepo.findOneBy({ id: userId });
                  if (user?.email) {
                    await this.mailService.sendMailNotification(
                      user.email,
                      [user.firstName, user.lastName]
                        .filter(Boolean)
                        .join(' ') || user.email,
                      title,
                      message,
                      content,
                      senderName,
                    );
                  }
                }
                deltaSent++;
              } catch (err) {
                this.logger.error(
                  `Failed to send notification to user ${userId}: ${err}`,
                );
                deltaFailed++;
              }
            }
          };
          processChunk().then(resolve).catch(resolve);
        });
      });

      totalSent += deltaSent;
      totalFailed += deltaFailed;

      if (deltaSent > 0) {
        await this.campaignRepo.increment(
          { id: campaignId },
          'sentCount',
          deltaSent,
        );
      }
      if (deltaFailed > 0) {
        await this.campaignRepo.increment(
          { id: campaignId },
          'failedCount',
          deltaFailed,
        );
      }
    }

    const finalStatus =
      totalFailed === recipientIds.length && recipientIds.length > 0
        ? CampaignStatus.FAILED
        : CampaignStatus.COMPLETED;

    await this.campaignRepo.update(campaignId, { status: finalStatus });

    // Send in-app notification to sender when campaign finishes
    const isCompleted = finalStatus === CampaignStatus.COMPLETED;
    await this.notificationCoreService.send({
      userId: senderId,
      type: 'campaign_result',
      title: isCompleted ? 'Campaign sent successfully' : 'Campaign failed',
      message: isCompleted
        ? `Your campaign "${title}" was delivered to ${totalSent}/${recipientIds.length} recipients.`
        : `Your campaign "${title}" failed. ${totalFailed}/${recipientIds.length} could not be delivered.`,
      data: {
        campaignId,
        sentCount: totalSent,
        failedCount: totalFailed,
        totalRecipients: recipientIds.length,
      },
    });

    // Emit socket progress event
    this.websocketService.emitToUser(senderId, WsEvents.CAMPAIGN_PROGRESS, {
      campaignId,
      status: finalStatus as unknown as WsCampaignStatus,
      totalRecipients: recipientIds.length,
      sentCount: totalSent,
      failedCount: totalFailed,
    });
  }

  async findCampaigns(
    query: GetCampaignsQueryDto,
  ): Promise<CampaignListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.campaignRepo
      .createQueryBuilder('campaign')
      .orderBy('campaign.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('campaign.status = :status', { status: query.status });
    }

    if (query.orgId) {
      qb.andWhere('campaign.targetOrgId = :orgId', { orgId: query.orgId });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items.map((item) => CampaignResponse.fromEntity(item)),
      total,
    };
  }

  async findOneCampaign(id: string, orgId?: string): Promise<CampaignResponse> {
    const campaign = await this.campaignRepo.findOneBy({ id });
    if (!campaign) {
      throw new ValidationException(ErrorCode.N005, 'Campaign not found');
    }

    if (orgId && campaign.targetOrgId !== orgId) {
      throw new ValidationException(ErrorCode.N005, 'Campaign not found');
    }

    return CampaignResponse.fromEntity(campaign);
  }
}
