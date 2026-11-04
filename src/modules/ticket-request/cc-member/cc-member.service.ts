import {
  ConflictException,
  ForbiddenException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';

import { TicketRequestCcMember } from '../core/entities/ticket-request-cc-member.entity';
import {
  TicketRequestActivity,
  TicketRequestActivityAction,
} from '../core/entities/ticket-request-activity.entity';
import { AddCcMembersRequest } from './dto/request/manage-cc-members.request';
import { TicketRequestDetailResponse } from '../core/dto/response/ticket-request.response';
import { TicketRequestCoreService } from '../core/core.service';
import {
  TicketRequest,
  TicketRequestStatus,
} from '../core/entities/ticket-request.entity';

@Injectable()
export class TicketRequestCcMemberService {
  constructor(
    @InjectRepository(TicketRequestCcMember)
    private readonly ccMemberRepo: Repository<TicketRequestCcMember>,

    private readonly dataSource: DataSource,
    private readonly coreService: TicketRequestCoreService,
  ) {}

  async addCcMembers(
    ticketId: string,
    orgId: string,
    callerId: string,
    dto: AddCcMembersRequest,
  ): Promise<TicketRequestDetailResponse> {
    const ticket = await this.coreService.getTicketOrThrow(ticketId, orgId);
    this.ensureCanManageCc(ticket, callerId);
    const effortOwnerIds = this.coreService.getConfiguredEffortOwnerIds(ticket);

    const excludedCcMemberIds = [
      ticket.requesterId,
      ...effortOwnerIds,
    ];
    const defaultCcMemberIds = await this.coreService.getDefaultCcMemberIds(
      orgId,
      excludedCcMemberIds,
    );
    const sanitized = [
      ...new Set([
        ...this.coreService.sanitizeCcMemberIds(
          dto.memberIds,
          excludedCcMemberIds,
        ),
        ...defaultCcMemberIds,
      ]),
    ];

    if (sanitized.length === 0) {
      return this.coreService.getTicketDetail(ticket.id, orgId, callerId);
    }

    await this.coreService.ensureMembersExist(orgId, sanitized);

    const existing = await this.ccMemberRepo.find({
      where: {
        ticketRequestId: ticket.id,
        memberId: In(sanitized),
      },
    });

    const existingSet = new Set(existing.map((item) => item.memberId));
    const newMemberIds = sanitized.filter(
      (memberId) => !existingSet.has(memberId),
    );

    if (newMemberIds.length === 0) {
      return this.coreService.getTicketDetail(ticket.id, orgId, callerId);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        TicketRequestCcMember,
        newMemberIds.map((memberId) =>
          manager.create(TicketRequestCcMember, {
            ticketRequestId: ticket.id,
            memberId,
            addedBy: callerId,
          }),
        ),
      );

      await manager.save(
        TicketRequestActivity,
        manager.create(TicketRequestActivity, {
          ticketRequestId: ticket.id,
          actorId: callerId,
          action: TicketRequestActivityAction.CC_ADDED,
          payload: {
            memberIds: newMemberIds,
          },
        }),
      );
    });

    void this.coreService.notifyUsers(
      newMemberIds,
      `[Ticket ${ticket.code}] Added to CC`,
      `You were added to CC list of this ticket request.`,
      {
        ticket,
        actorId: callerId,
        action: TicketRequestActivityAction.CC_ADDED,
      },
    );

    return this.coreService.getTicketDetail(ticket.id, orgId, callerId);
  }

  async removeCcMember(
    ticketId: string,
    orgId: string,
    callerId: string,
    memberId: string,
  ): Promise<TicketRequestDetailResponse> {
    const ticket = await this.coreService.getTicketOrThrow(ticketId, orgId);
    this.ensureCanManageCc(ticket, callerId);

    const orgAdminMemberIds =
      await this.coreService.getOrganizationAdminMemberIds(orgId);
    if (orgAdminMemberIds.includes(memberId)) {
      throw new ConflictException(
        'Organization admin is default CC and cannot be removed',
      );
    }

    const existing = await this.ccMemberRepo.findOne({
      where: {
        ticketRequestId: ticket.id,
        memberId,
      },
    });

    if (!existing) {
      throw new ValidationException(
        ErrorCode.O003,
        'CC member is not attached to this ticket',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(TicketRequestCcMember).delete(existing.id);

      await manager.save(
        TicketRequestActivity,
        manager.create(TicketRequestActivity, {
          ticketRequestId: ticket.id,
          actorId: callerId,
          action: TicketRequestActivityAction.CC_REMOVED,
          payload: {
            memberId,
          },
        }),
      );
    });

    void this.coreService.notifyUsers(
      [memberId],
      `[Ticket ${ticket.code}] Removed from CC`,
      `You were removed from CC list of this ticket request.`,
      {
        ticket,
        actorId: callerId,
        action: TicketRequestActivityAction.CC_REMOVED,
      },
    );

    return this.coreService.getTicketDetail(ticket.id, orgId, callerId);
  }

  private ensureCanManageCc(ticket: TicketRequest, callerId: string): void {
    const terminalStatuses: TicketRequestStatus[] = [
      TicketRequestStatus.APPROVED,
      TicketRequestStatus.REJECTED,
      TicketRequestStatus.CANCELED,
    ];
    if (terminalStatuses.includes(ticket.status)) {
      throw new BadRequestException(
        'Cannot manage CC members on a completed ticket',
      );
    }

    if (
      ticket.requesterId === callerId ||
      ticket.delegateId === callerId ||
      this.coreService.getConfiguredEffortOwnerIds(ticket).includes(callerId)
    ) {
      return;
    }

    throw new ForbiddenException('You are not allowed to manage CC members');
  }
}
