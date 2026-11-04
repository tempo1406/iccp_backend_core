import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import * as dayjs from 'dayjs';
import { ConfigService } from '@nestjs/config';

import {
  InvitationStatus,
  OrganizationInvitation,
} from '@modules/organization/core/entities/organization-invitation.entity';
import { Organization } from '@modules/organization/core/entities/organization.entity';
import { AllConfigType } from '@configs/config.type';
import {
  INVITATION_EVENTS,
  InvitationCancelledEvent,
  InvitationResentEvent,
} from './constants/invitation-events.constant';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';
import { PaginationHelper } from '@common/helpers/pagination.helper';
import { PaginatedResponse } from '@common/dto/paginated.response';

import {
  INVITATION_SORT_FIELDS,
  ListInvitationsRequest,
} from './dto/request/list-invitations.request';
import { InvitationDetailResponse } from './dto/response/invitation-detail.response';
import { InvitationAnalyticsResponse } from './dto/response/invitation-analytics.response';

@Injectable()
export class InviteManagerService {
  constructor(
    @InjectRepository(OrganizationInvitation)
    private readonly invitationRepo: Repository<OrganizationInvitation>,

    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    private readonly configService: ConfigService<AllConfigType>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Lấy danh sách lời mời của org — có pagination + filter theo status
  async findAll(
    orgId: string,
    query: ListInvitationsRequest,
  ): Promise<PaginatedResponse<InvitationDetailResponse>> {
    const alias = 'inv';
    const qb = this.invitationRepo
      .createQueryBuilder(alias)
      .where(`${alias}.organization_id = :orgId`, { orgId });

    if (query.status) {
      qb.andWhere(`${alias}.status = :status`, { status: query.status });
    }

    PaginationHelper.applyToQueryBuilder(
      qb,
      query,
      INVITATION_SORT_FIELDS,
      alias,
    );

    const [invitations, total] = await qb.getManyAndCount();

    const data = invitations.map((inv) => this.toDetailResponse(inv));
    const meta = PaginationHelper.buildMeta(total, query);

    return new PaginatedResponse(data, meta);
  }

  // Lấy chi tiết một lời mời
  async findOne(
    orgId: string,
    invitationId: string,
  ): Promise<InvitationDetailResponse> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, organizationId: orgId },
    });
    if (!invitation) throw new ValidationException(ErrorCode.O004);

    return this.toDetailResponse(invitation);
  }

  // Vô hiệu hoá lời mời — chỉ được cancel khi đang PENDING
  async cancel(orgId: string, invitationId: string): Promise<void> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, organizationId: orgId },
    });
    if (!invitation) throw new ValidationException(ErrorCode.O004);

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ForbiddenException(
        `Không thể huỷ lời mời có trạng thái "${invitation.status}"`,
      );
    }

    invitation.status = InvitationStatus.CANCELLED;
    await this.invitationRepo.save(invitation);

    const org = await this.orgRepo.findOne({
      where: { id: orgId, isActive: true },
    });
    this.eventEmitter.emit(INVITATION_EVENTS.CANCELLED, {
      invitationId: invitation.id,
      email: invitation.email,
      orgId,
      orgName: org?.name ?? '',
    } satisfies InvitationCancelledEvent);
  }

  // Mời lại — tạo token mới, gia hạn thêm 7 ngày, gửi lại email
  // Cho phép resend khi: PENDING (token sắp hết hạn) hoặc EXPIRED / CANCELLED
  async resend(
    orgId: string,
    invitationId: string,
    invitedBy: string,
  ): Promise<InvitationDetailResponse> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, organizationId: orgId },
    });
    if (!invitation) throw new ValidationException(ErrorCode.O004);

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new ForbiddenException(
        'Lời mời đã được chấp nhận, không thể gửi lại',
      );
    }

    const org = await this.orgRepo.findOne({
      where: { id: orgId, isActive: true },
    });
    if (!org) throw new ValidationException(ErrorCode.O001);

    // Tạo token mới + gia hạn
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = dayjs().add(7, 'day').toDate();

    invitation.token = newToken;
    invitation.expiresAt = newExpiresAt;
    invitation.status = InvitationStatus.PENDING;
    invitation.invitedBy = invitedBy;

    const saved = await this.invitationRepo.save(invitation);

    // Emit event — email + in-app notification handled by InvitationNotificationListener
    const appConfig = this.configService.get('app', { infer: true })!;
    const acceptUrl = `${appConfig.frontendDomain}/invitations/accept?token=${newToken}`;
    this.eventEmitter.emit(INVITATION_EVENTS.RESENT, {
      invitationId: saved.id,
      email: saved.email,
      orgId,
      orgName: org.name,
      invitedBy,
      token: newToken,
      expiresAt: newExpiresAt,
      acceptUrl,
      message: saved.message,
    } satisfies InvitationResentEvent);

    return this.toDetailResponse(saved);
  }

  async getAnalytics(orgId: string): Promise<InvitationAnalyticsResponse> {
    const rows = await this.invitationRepo
      .createQueryBuilder('inv')
      .select('inv.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('inv.organization_id = :orgId', { orgId })
      .groupBy('inv.status')
      .getRawMany<{ status: InvitationStatus; count: string }>();

    const counts: Partial<Record<InvitationStatus, number>> = {};
    for (const row of rows) {
      counts[row.status] = parseInt(row.count, 10);
    }

    const pending = counts[InvitationStatus.PENDING] ?? 0;
    const accepted = counts[InvitationStatus.ACCEPTED] ?? 0;
    const expired = counts[InvitationStatus.EXPIRED] ?? 0;
    const cancelled = counts[InvitationStatus.CANCELLED] ?? 0;
    const total = pending + accepted + expired + cancelled;
    const needsAttention = expired + cancelled;
    const acceptanceRate =
      total > 0 ? Math.round((accepted / total) * 1000) / 10 : 0;

    return {
      total,
      pending,
      accepted,
      needsAttention,
      expired,
      cancelled,
      acceptanceRate,
    };
  }

  private toDetailResponse(
    inv: OrganizationInvitation,
  ): InvitationDetailResponse {
    const isExpired =
      inv.status === InvitationStatus.PENDING && inv.expiresAt < new Date();

    return plainToInstance(
      InvitationDetailResponse,
      { ...inv, isExpired },
      { excludeExtraneousValues: true },
    );
  }
}
