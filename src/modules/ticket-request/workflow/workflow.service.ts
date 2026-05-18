import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  TicketRequest,
  TicketRequestStatus,
  TicketRequestWorkflowCode,
  TicketRequestWorkflowStepCode,
} from '../core/entities/ticket-request.entity';
import {
  TicketRequestActivity,
  TicketRequestActivityAction,
} from '../core/entities/ticket-request-activity.entity';
import {
  ApproveTicketRequestRequest,
  RejectTicketRequestRequest,
  RequestChangesTicketRequestRequest,
} from './dto/request/decision-ticket-request.request';
import { DeclareOtEffortRequest } from './dto/request/declare-ot-effort.request';
import { UpdateTicketRequestRequest } from './dto/request/update-ticket-request.request';
import { TicketRequestDetailResponse } from '../core/dto/response/ticket-request.response';
import { TicketRequestCoreService } from '../core/core.service';
import { TicketRequestCcMember } from '../core/entities/ticket-request-cc-member.entity';
import {
  WorkflowStepDefinition,
  getCurrentStep,
  getNextStepOrThrow,
  getOptionalNextStep,
  getWorkflowStep,
  getSubmitterIdsForStep,
} from '../ticket-request-workflow-engine';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';
import { DEFAULT_TIMEZONE } from '@common/constants/timezone.constant';

@Injectable()
export class TicketRequestWorkflowService {
  constructor(
    @InjectRepository(TicketRequest)
    private readonly ticketRepo: Repository<TicketRequest>,

    @InjectRepository(TicketRequestActivity)
    private readonly activityRepo: Repository<TicketRequestActivity>,

    @InjectRepository(TicketRequestCcMember)
    private readonly ccMemberRepo: Repository<TicketRequestCcMember>,

    private readonly dataSource: DataSource,
    private readonly coreService: TicketRequestCoreService,
  ) {}

  async declareOtEffort(
    ticketId: string,
    orgId: string,
    userId: string,
    dto: DeclareOtEffortRequest,
  ): Promise<TicketRequestDetailResponse> {
    const ticket = await this.coreService.getTicketOrThrow(ticketId, orgId);
    const currentStep = getCurrentStep(ticket);
    const effortOwnerIds = this.coreService.getConfiguredEffortOwnerIds(ticket);

    if (
      currentStep.code !==
      TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT
    ) {
      throw new ConflictException(
        'OT effort declaration is only allowed at the PROJECT_MEMBER_DECLARE_OT step',
      );
    }

    if (ticket.status !== TicketRequestStatus.PENDING_SUBMISSION) {
      throw new ConflictException(
        'Ticket must be in pending_submission status to declare OT effort',
      );
    }

    this.ensureCanSubmitCurrentStep(ticket, userId, currentStep.code);
    this.validateOtEffortEntries(ticket, dto);

    const rawNextStep = getNextStepOrThrow(ticket.workflowCode, currentStep);

    // Skip PM_CONFIRM when effort owner is the same as requester (PM declaring their own OT)
    const skipPmConfirm =
      rawNextStep.code === TicketRequestWorkflowStepCode.PM_CONFIRM &&
      effortOwnerIds.length === 1 &&
      effortOwnerIds[0] === ticket.requesterId;

    const nextStep = skipPmConfirm
      ? getNextStepOrThrow(ticket.workflowCode, rawNextStep)
      : rawNextStep;

    const nextDelegateId = await this.resolveDelegateForStep(
      ticket,
      orgId,
      nextStep.code,
      {
        requestedDelegateId: dto.nextDelegateId,
      },
    );

    await this.dataSource.transaction(async (manager) => {
      const fromStatus = ticket.status;

      ticket.otMetadata = {
        ...ticket.otMetadata,
        effortEntries: dto.effortEntries,
        totalActualHours: dto.totalActualHours,
        effortDetail: dto.effortDetail,
      };
      ticket.status = TicketRequestStatus.PENDING_APPROVAL;
      ticket.currentStepCode = nextStep.code;
      ticket.currentStepOrder = nextStep.order;
      ticket.delegateId = nextDelegateId;
      ticket.decisionNote = undefined;
      ticket.decidedAt = undefined;
      ticket.decidedBy = undefined;

      await manager.getRepository(TicketRequest).save(ticket);

      await manager.save(
        TicketRequestActivity,
        manager.create(TicketRequestActivity, {
          ticketRequestId: ticket.id,
          actorId: userId,
          action: TicketRequestActivityAction.SUBMITTED,
          fromStatus,
          toStatus: TicketRequestStatus.PENDING_APPROVAL,
          payload: {
            fromStepCode: currentStep.code,
            toStepCode: nextStep.code,
            nextDelegateId,
            totalActualHours: dto.totalActualHours,
          },
        }),
      );
    });

    void this.coreService.notifyUsers(
      [ticket.delegateId].filter((id) => !!id && id !== userId),
      `[Ticket ${ticket.code}] OT effort declared`,
      `OT effort has been declared and is waiting for your confirmation.`,
      {
        ticket,
        actorId: userId,
        action: TicketRequestActivityAction.SUBMITTED,
      },
    );

    return this.coreService.getTicketDetail(ticketId, orgId, userId);
  }

  async updateTicket(
    ticketId: string,
    orgId: string,
    requesterId: string,
    dto: UpdateTicketRequestRequest,
  ): Promise<TicketRequestDetailResponse> {
    const ticket = await this.coreService.getTicketOrThrow(ticketId, orgId);
    const currentStep = getCurrentStep(ticket);

    if (ticket.status !== TicketRequestStatus.CHANGES_REQUESTED) {
      throw new ConflictException(
        'Only ticket in changes_requested can be updated and resubmitted',
      );
    }

    if (currentStep.actionType !== 'submit') {
      throw new ConflictException(
        'Current workflow step does not accept submit action',
      );
    }

    this.ensureCanSubmitCurrentStep(ticket, requesterId, currentStep.code);

    const resolvedRequestType =
      dto.requestTypeCode || dto.requestTypeName || dto.type
        ? this.coreService.resolveRequestDisplayTypeInput(
            dto.requestTypeCode ?? ticket.requestTypeCode,
            dto.requestTypeName ?? ticket.requestTypeName,
            dto.type ?? ticket.type,
            ticket.workflowCode,
          )
        : undefined;

    this.coreService.validateReasonCode(dto.reasonCode);

    let sanitizedCcMemberIds: string[] | undefined;
    if (dto.ccMemberIds) {
      const effortOwnerIds =
        this.coreService.getConfiguredEffortOwnerIds(ticket);
      const excludedCcMemberIds = this.filterUserIds([
        ticket.requesterId,
        ticket.delegateId,
        ...effortOwnerIds,
      ]);
      const defaultCcMemberIds = await this.coreService.getDefaultCcMemberIds(
        orgId,
        excludedCcMemberIds,
      );
      const requestedCcMemberIds = this.coreService.sanitizeCcMemberIds(
        dto.ccMemberIds,
        excludedCcMemberIds,
      );
      sanitizedCcMemberIds = [
        ...new Set([...requestedCcMemberIds, ...defaultCcMemberIds]),
      ];
      if (sanitizedCcMemberIds.length > 0) {
        await this.coreService.ensureMembersExist(orgId, sanitizedCcMemberIds);
      }
    }

    const startAt = dto.startAt
      ? this.coreService.parseOptionalDate(dto.startAt)
      : undefined;
    const endAt = dto.endAt
      ? this.coreService.parseOptionalDate(dto.endAt)
      : undefined;
    this.coreService.validateDateRange(
      startAt ?? ticket.startAt,
      endAt ?? ticket.endAt,
    );

    const nextStep = getNextStepOrThrow(ticket.workflowCode, currentStep);
    if (nextStep.actionType !== 'approve') {
      throw new ConflictException(
        'Submit step must transition to an approval step',
      );
    }

    const nextDelegateId = await this.resolveDelegateForStep(
      ticket,
      orgId,
      nextStep.code,
      {
        requestedDelegateId: dto.nextDelegateId,
      },
    );

    await this.dataSource.transaction(async (manager) => {
      const updateRepo = manager.getRepository(TicketRequest);
      const ccRepo = manager.getRepository(TicketRequestCcMember);

      if (resolvedRequestType) {
        ticket.type = resolvedRequestType.type;
        ticket.requestTypeCode = resolvedRequestType.code;
        ticket.requestTypeName = resolvedRequestType.label;
      }
      if (dto.title !== undefined) ticket.title = dto.title;
      if (dto.content !== undefined) ticket.content = dto.content;
      if (dto.reasonCode !== undefined) ticket.reasonCode = dto.reasonCode;
      if (dto.reasonDetail !== undefined)
        ticket.reasonDetail = dto.reasonDetail;
      if (dto.startAt !== undefined) ticket.startAt = startAt;
      if (dto.endAt !== undefined) ticket.endAt = endAt;

      const fromStatus = ticket.status;
      ticket.status = TicketRequestStatus.PENDING_APPROVAL;
      ticket.currentStepCode = nextStep.code;
      ticket.currentStepOrder = nextStep.order;
      ticket.delegateId = nextDelegateId;
      ticket.decisionNote = undefined;
      ticket.decidedAt = undefined;
      ticket.decidedBy = undefined;

      await updateRepo.save(ticket);

      if (sanitizedCcMemberIds) {
        await ccRepo.delete({ ticketRequestId: ticket.id });

        if (sanitizedCcMemberIds.length > 0) {
          await ccRepo.save(
            sanitizedCcMemberIds.map((memberId) =>
              ccRepo.create({
                ticketRequestId: ticket.id,
                memberId,
                addedBy: requesterId,
              }),
            ),
          );
        }
      }

      await manager.save(
        TicketRequestActivity,
        manager.create(TicketRequestActivity, {
          ticketRequestId: ticket.id,
          actorId: requesterId,
          action: TicketRequestActivityAction.SUBMITTED,
          fromStatus,
          toStatus: TicketRequestStatus.PENDING_APPROVAL,
          payload: {
            fields: Object.keys(dto),
            fromStepCode: currentStep.code,
            toStepCode: nextStep.code,
            nextDelegateId,
          },
        }),
      );
    });

    const effortOwnerIds = this.coreService.getConfiguredEffortOwnerIds(ticket);
    const ccMembers =
      sanitizedCcMemberIds ??
      (await this.coreService.getTicketCcMemberIds(ticket.id, {
        orgId,
        excluded: [ticket.requesterId, ticket.delegateId, ...effortOwnerIds],
      }));

    void this.coreService.notifyUsers(
      [ticket.delegateId, ...ccMembers].filter(
        (userId) => userId !== requesterId,
      ),
      `[Ticket ${ticket.code}] Ticket resubmitted`,
      `A ticket request has been updated and resubmitted for review.`,
      {
        ticket,
        actorId: requesterId,
        action: TicketRequestActivityAction.SUBMITTED,
      },
    );

    return this.coreService.getTicketDetail(ticketId, orgId, requesterId);
  }

  async approveTicket(
    ticketId: string,
    orgId: string,
    actorId: string,
    dto: ApproveTicketRequestRequest,
  ): Promise<TicketRequestDetailResponse> {
    const ticket = await this.coreService.getTicketOrThrow(ticketId, orgId);
    this.ensureCanProcessTicket(ticket, actorId);

    const currentStep = getCurrentStep(ticket);
    if (ticket.status !== TicketRequestStatus.PENDING_APPROVAL) {
      throw new ConflictException(
        'Only ticket in pending_approval can be processed',
      );
    }

    if (currentStep.actionType !== 'approve') {
      throw new ConflictException(
        'Current workflow step does not support approve action',
      );
    }

    const nextStep = getOptionalNextStep(ticket.workflowCode, currentStep);

    if (!nextStep) {
      await this.dataSource.transaction(async (manager) => {
        const fromStatus = ticket.status;
        ticket.status = TicketRequestStatus.APPROVED;
        ticket.currentStepCode = TicketRequestWorkflowStepCode.COMPLETED;
        ticket.currentStepOrder = currentStep.order + 1;
        ticket.decisionNote = dto.note;
        ticket.decidedBy = actorId;
        ticket.decidedAt = new Date();

        await manager.getRepository(TicketRequest).save(ticket);

        await manager.save(
          TicketRequestActivity,
          manager.create(TicketRequestActivity, {
            ticketRequestId: ticket.id,
            actorId,
            action: TicketRequestActivityAction.APPROVED,
            fromStatus,
            toStatus: TicketRequestStatus.APPROVED,
            payload: {
              fromStepCode: currentStep.code,
              toStepCode: TicketRequestWorkflowStepCode.COMPLETED,
              note: dto.note,
            },
          }),
        );
      });

      const effortOwnerIds =
        this.coreService.getConfiguredEffortOwnerIds(ticket);
      const ccMemberIds = await this.coreService.getTicketCcMemberIds(
        ticket.id,
        {
          orgId,
          excluded: [ticket.requesterId, ticket.delegateId, ...effortOwnerIds],
        },
      );
      void this.coreService.notifyUsers(
        this.filterUserIds([
          ticket.requesterId,
          ...effortOwnerIds,
          ...ccMemberIds,
        ]).filter((userId) => userId !== actorId),
        `[Ticket ${ticket.code}] Ticket approved`,
        `Your ticket request has been approved.`,
        {
          ticket,
          actorId,
          action: TicketRequestActivityAction.APPROVED,
        },
      );

      return this.coreService.getTicketDetail(ticket.id, orgId, actorId);
    }

    if (nextStep.actionType === 'approve') {
      const nextDelegateId = await this.resolveDelegateForStep(
        ticket,
        orgId,
        nextStep.code,
        {
          requestedDelegateId: dto.nextDelegateId,
        },
      );

      await this.dataSource.transaction(async (manager) => {
        const fromStatus = ticket.status;
        ticket.status = TicketRequestStatus.PENDING_APPROVAL;
        ticket.currentStepCode = nextStep.code;
        ticket.currentStepOrder = nextStep.order;
        ticket.delegateId = nextDelegateId;
        ticket.decisionNote = undefined;
        ticket.decidedAt = undefined;
        ticket.decidedBy = undefined;

        await manager.getRepository(TicketRequest).save(ticket);

        await manager.save(
          TicketRequestActivity,
          manager.create(TicketRequestActivity, {
            ticketRequestId: ticket.id,
            actorId,
            action: TicketRequestActivityAction.APPROVED,
            fromStatus,
            toStatus: TicketRequestStatus.PENDING_APPROVAL,
            payload: {
              fromStepCode: currentStep.code,
              toStepCode: nextStep.code,
              note: dto.note,
              nextDelegateId,
            },
          }),
        );
      });

      const effortOwnerIds =
        this.coreService.getConfiguredEffortOwnerIds(ticket);
      const ccMemberIds = await this.coreService.getTicketCcMemberIds(
        ticket.id,
        {
          orgId,
          excluded: [ticket.requesterId, ticket.delegateId, ...effortOwnerIds],
        },
      );
      void this.coreService.notifyUsers(
        this.filterUserIds([
          ticket.delegateId,
          ticket.requesterId,
          ...effortOwnerIds,
          ...ccMemberIds,
        ]).filter((userId) => userId !== actorId),
        `[Ticket ${ticket.code}] Step approved`,
        `A workflow step was approved and moved to next approval gate.`,
        {
          ticket,
          actorId,
          action: TicketRequestActivityAction.APPROVED,
        },
      );

      return this.coreService.getTicketDetail(ticket.id, orgId, actorId);
    }

    let stagedDelegateId = ticket.delegateId;
    const stagedNextDelegateId = dto.nextDelegateId;
    const nextStepAfterSubmit = getOptionalNextStep(
      ticket.workflowCode,
      nextStep,
    );
    if (nextStepAfterSubmit && nextStepAfterSubmit.actionType === 'approve') {
      stagedDelegateId = await this.resolveDelegateForStep(
        ticket,
        orgId,
        nextStepAfterSubmit.code,
        {
          requestedDelegateId: stagedNextDelegateId,
          fallbackDelegateId: stagedDelegateId,
        },
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const fromStatus = ticket.status;
      ticket.status = TicketRequestStatus.PENDING_SUBMISSION;
      ticket.currentStepCode = nextStep.code;
      ticket.currentStepOrder = nextStep.order;
      ticket.delegateId = stagedDelegateId;
      ticket.decisionNote = dto.note;
      ticket.decidedAt = new Date();
      ticket.decidedBy = actorId;

      await manager.getRepository(TicketRequest).save(ticket);

      await manager.save(
        TicketRequestActivity,
        manager.create(TicketRequestActivity, {
          ticketRequestId: ticket.id,
          actorId,
          action: TicketRequestActivityAction.APPROVED,
          fromStatus,
          toStatus: TicketRequestStatus.PENDING_SUBMISSION,
          payload: {
            fromStepCode: currentStep.code,
            toStepCode: nextStep.code,
            note: dto.note,
            stagedDelegateId,
          },
        }),
      );
    });

    const submitterIds = getSubmitterIdsForStep(ticket, nextStep.code);
    const effortOwnerIds = this.coreService.getConfiguredEffortOwnerIds(ticket);
    const ccMemberIds = await this.coreService.getTicketCcMemberIds(ticket.id, {
      orgId,
      excluded: [ticket.requesterId, ticket.delegateId, ...effortOwnerIds],
    });
    void this.coreService.notifyUsers(
      this.filterUserIds([
        ...submitterIds,
        ticket.requesterId,
        ...ccMemberIds,
      ]).filter((userId) => userId !== actorId),
      `[Ticket ${ticket.code}] Action required`,
      `The ticket moved to a submit step and needs update/resubmission.`,
      {
        ticket,
        actorId,
        action: TicketRequestActivityAction.APPROVED,
      },
    );

    return this.coreService.getTicketDetail(ticket.id, orgId, actorId);
  }

  async rejectTicket(
    ticketId: string,
    orgId: string,
    actorId: string,
    dto: RejectTicketRequestRequest,
  ): Promise<TicketRequestDetailResponse> {
    const ticket = await this.coreService.getTicketOrThrow(ticketId, orgId);
    this.ensureCanProcessTicket(ticket, actorId);

    const currentStep = getCurrentStep(ticket);
    if (ticket.status !== TicketRequestStatus.PENDING_APPROVAL) {
      throw new ConflictException(
        'Only ticket in pending_approval can be processed',
      );
    }

    if (currentStep.actionType !== 'approve') {
      throw new ConflictException(
        'Current workflow step does not support reject action',
      );
    }

    if (currentStep.rejectMode === 'terminal') {
      return this.rejectTerminal(
        ticket,
        orgId,
        actorId,
        dto.reason,
        currentStep,
      );
    }

    const rejectToStepCode = currentStep.rejectToStep;
    if (!rejectToStepCode) {
      throw new ConflictException(
        'Reject route is not configured for current step',
      );
    }

    return this.sendBackToSubmitStep(
      ticket,
      orgId,
      actorId,
      dto.reason,
      TicketRequestActivityAction.REJECTED,
      rejectToStepCode,
      dto.nextDelegateId,
    );
  }

  async requestChangesTicket(
    ticketId: string,
    orgId: string,
    actorId: string,
    dto: RequestChangesTicketRequestRequest,
  ): Promise<TicketRequestDetailResponse> {
    const ticket = await this.coreService.getTicketOrThrow(ticketId, orgId);
    this.ensureCanProcessTicket(ticket, actorId);

    const currentStep = getCurrentStep(ticket);
    if (ticket.status !== TicketRequestStatus.PENDING_APPROVAL) {
      throw new ConflictException(
        'Only ticket in pending_approval can be processed',
      );
    }

    if (currentStep.actionType !== 'approve') {
      throw new ConflictException(
        'Current workflow step does not support request-changes action',
      );
    }

    const targetStep = this.getRequestChangesTargetStep(
      ticket.workflowCode,
      currentStep,
    );

    return this.sendBackToSubmitStep(
      ticket,
      orgId,
      actorId,
      dto.reason,
      TicketRequestActivityAction.CHANGES_REQUESTED,
      targetStep,
      dto.nextDelegateId,
    );
  }

  // ─── Private helpers ───

  private ensureCanProcessTicket(ticket: TicketRequest, userId: string): void {
    if (ticket.delegateId === userId) return;

    throw new ForbiddenException(
      'Only assigned delegate can process this ticket',
    );
  }

  private ensureCanSubmitCurrentStep(
    ticket: TicketRequest,
    callerId: string,
    stepCode: TicketRequestWorkflowStepCode,
  ): void {
    const submitterIds = getSubmitterIdsForStep(ticket, stepCode);
    if (!submitterIds.includes(callerId)) {
      throw new ForbiddenException(
        'Only assigned submitter can submit this workflow step',
      );
    }
  }

  private filterUserIds(userIds: Array<string | undefined | null>): string[] {
    return userIds.filter(
      (userId): userId is string =>
        typeof userId === 'string' && userId.trim().length > 0,
    );
  }

  private validateOtEffortEntries(
    ticket: TicketRequest,
    dto: DeclareOtEffortRequest,
  ): void {
    const perDayHours = new Map<string, number>();
    const ticketStartDate = ticket.startAt
      ? this.toLocalDateString(ticket.startAt)
      : undefined;
    const ticketEndDate = ticket.endAt
      ? this.toLocalDateString(ticket.endAt)
      : undefined;

    for (const entry of dto.effortEntries) {
      if (entry.hours > 4) {
        throw new ValidationException(
          ErrorCode.V005,
          'OT hours cannot exceed 4 hours in a single day',
        );
      }

      if (
        ticketStartDate &&
        ticketEndDate &&
        (entry.date < ticketStartDate || entry.date > ticketEndDate)
      ) {
        throw new ValidationException(
          ErrorCode.V005,
          'Effort entry date must be within the OT request schedule',
        );
      }

      perDayHours.set(
        entry.date,
        (perDayHours.get(entry.date) ?? 0) + entry.hours,
      );
    }

    for (const hours of perDayHours.values()) {
      if (hours > 4) {
        throw new ValidationException(
          ErrorCode.V005,
          'Total OT hours declared for a day cannot exceed 4 hours',
        );
      }
    }
  }

  private getRequestChangesTargetStep(
    workflowCode: TicketRequestWorkflowCode,
    currentStep: WorkflowStepDefinition,
  ): TicketRequestWorkflowStepCode {
    if (
      workflowCode === TicketRequestWorkflowCode.WORKING_TIME ||
      workflowCode === TicketRequestWorkflowCode.WORKING_TIME_DIRECT
    ) {
      return TicketRequestWorkflowStepCode.EMP_CREATE_REQUEST;
    }

    if (
      workflowCode === TicketRequestWorkflowCode.OVERTIME_OPIC &&
      [
        TicketRequestWorkflowStepCode.ORG_CONFIRM,
        TicketRequestWorkflowStepCode.OPIC_APPROVE_PRE,
      ].includes(currentStep.code)
    ) {
      return TicketRequestWorkflowStepCode.PM_CREATE_REQUEST;
    }

    if (
      workflowCode === TicketRequestWorkflowCode.OVERTIME_STANDARD_DIRECT &&
      currentStep.code === TicketRequestWorkflowStepCode.ORG_APPROVE_PRE
    ) {
      return TicketRequestWorkflowStepCode.PM_CREATE_REQUEST;
    }

    return TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT;
  }

  private toLocalDateString(value: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }

  private async resolveDelegateForStep(
    ticket: TicketRequest,
    orgId: string,
    stepCode: TicketRequestWorkflowStepCode,
    options?: {
      requestedDelegateId?: string;
      fallbackDelegateId?: string;
    },
  ): Promise<string> {
    if (this.isOrganizationApprovalStep(stepCode)) {
      return this.resolveOrganizationApprovalDelegate(
        orgId,
        options?.requestedDelegateId,
      );
    }

    const delegateId =
      options?.requestedDelegateId ??
      (stepCode === TicketRequestWorkflowStepCode.PM_CONFIRM
        ? ticket.requesterId
        : (options?.fallbackDelegateId ?? ticket.delegateId));

    await this.coreService.ensureMembersExist(orgId, [delegateId]);

    if (
      stepCode !== TicketRequestWorkflowStepCode.PM_CONFIRM ||
      delegateId !== ticket.requesterId
    ) {
      await this.coreService.ensureUserCanBeDelegate(orgId, delegateId);
    }

    return delegateId;
  }

  private async resolveOrganizationApprovalDelegate(
    orgId: string,
    requestedDelegateId?: string,
  ): Promise<string> {
    if (requestedDelegateId) {
      await this.coreService.ensureMembersExist(orgId, [requestedDelegateId]);
      await this.coreService.ensureUserCanBeDelegate(
        orgId,
        requestedDelegateId,
      );

      const orgAdminIds =
        await this.coreService.getOrganizationAdminMemberIds(orgId);

      if (!orgAdminIds.includes(requestedDelegateId)) {
        throw new ForbiddenException(
          'Selected delegate must be an organization admin for this step',
        );
      }

      return requestedDelegateId;
    }

    const [eligibleDelegateIds, orgAdminIds] = await Promise.all([
      this.coreService.getEligibleDelegateIds(orgId),
      this.coreService.getOrganizationAdminMemberIds(orgId),
    ]);

    const orgAdminSet = new Set(orgAdminIds);
    const delegateId = eligibleDelegateIds.find((id) => orgAdminSet.has(id));

    if (!delegateId) {
      throw new ConflictException(
        'No org admin with delegate permission found to process this ticket',
      );
    }

    return delegateId;
  }

  private isOrganizationApprovalStep(
    stepCode: TicketRequestWorkflowStepCode,
  ): boolean {
    return [
      TicketRequestWorkflowStepCode.ORG_APPROVE,
      TicketRequestWorkflowStepCode.ORG_CONFIRM,
      TicketRequestWorkflowStepCode.ORG_APPROVE_PRE,
      TicketRequestWorkflowStepCode.ORG_APPROVE_POST,
    ].includes(stepCode);
  }

  private async rejectTerminal(
    ticket: TicketRequest,
    orgId: string,
    actorId: string,
    reason: string,
    currentStep: WorkflowStepDefinition,
  ): Promise<TicketRequestDetailResponse> {
    await this.dataSource.transaction(async (manager) => {
      const fromStatus = ticket.status;
      ticket.status = TicketRequestStatus.REJECTED;
      ticket.currentStepCode = TicketRequestWorkflowStepCode.REJECTED;
      ticket.currentStepOrder = currentStep.order;
      ticket.decisionNote = reason;
      ticket.decidedBy = actorId;
      ticket.decidedAt = new Date();

      await manager.getRepository(TicketRequest).save(ticket);

      await manager.save(
        TicketRequestActivity,
        manager.create(TicketRequestActivity, {
          ticketRequestId: ticket.id,
          actorId,
          action: TicketRequestActivityAction.REJECTED,
          fromStatus,
          toStatus: TicketRequestStatus.REJECTED,
          payload: {
            fromStepCode: currentStep.code,
            toStepCode: TicketRequestWorkflowStepCode.REJECTED,
            reason,
          },
        }),
      );
    });

    const effortOwnerIds = this.coreService.getConfiguredEffortOwnerIds(ticket);
    const ccMemberIds = await this.coreService.getTicketCcMemberIds(ticket.id, {
      orgId,
      excluded: [ticket.requesterId, ticket.delegateId, ...effortOwnerIds],
    });
    void this.coreService.notifyUsers(
      this.filterUserIds([
        ticket.requesterId,
        ...effortOwnerIds,
        ...ccMemberIds,
      ]).filter((userId) => userId !== actorId),
      `[Ticket ${ticket.code}] Ticket rejected`,
      `Your ticket request has been rejected.`,
      {
        ticket,
        actorId,
        action: TicketRequestActivityAction.REJECTED,
      },
    );

    return this.coreService.getTicketDetail(ticket.id, orgId, actorId);
  }

  private async sendBackToSubmitStep(
    ticket: TicketRequest,
    orgId: string,
    actorId: string,
    reason: string,
    action: TicketRequestActivityAction,
    targetStepCode: TicketRequestWorkflowStepCode,
    nextDelegateId?: string,
  ): Promise<TicketRequestDetailResponse> {
    const targetStep = getWorkflowStep(ticket.workflowCode, targetStepCode);
    if (targetStep.actionType !== 'submit') {
      throw new ConflictException(
        'Reject/request-changes target step must be a submit step',
      );
    }

    let stagedDelegateId = ticket.delegateId;
    const nextStepAfterSubmit = getOptionalNextStep(
      ticket.workflowCode,
      targetStep,
    );

    if (nextStepAfterSubmit && nextStepAfterSubmit.actionType === 'approve') {
      stagedDelegateId = await this.resolveDelegateForStep(
        ticket,
        orgId,
        nextStepAfterSubmit.code,
        {
          requestedDelegateId: nextDelegateId,
          fallbackDelegateId: stagedDelegateId,
        },
      );
    }

    const currentStep = getCurrentStep(ticket);

    const toStatus =
      targetStep.code ===
      TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT
        ? TicketRequestStatus.PENDING_SUBMISSION
        : TicketRequestStatus.CHANGES_REQUESTED;

    await this.dataSource.transaction(async (manager) => {
      const fromStatus = ticket.status;
      ticket.status = toStatus;
      ticket.currentStepCode = targetStep.code;
      ticket.currentStepOrder = targetStep.order;
      ticket.delegateId = stagedDelegateId;
      ticket.decisionNote = reason;
      ticket.decidedBy = actorId;
      ticket.decidedAt = new Date();

      await manager.getRepository(TicketRequest).save(ticket);

      await manager.save(
        TicketRequestActivity,
        manager.create(TicketRequestActivity, {
          ticketRequestId: ticket.id,
          actorId,
          action,
          fromStatus,
          toStatus,
          payload: {
            fromStepCode: currentStep.code,
            toStepCode: targetStep.code,
            reason,
            stagedDelegateId,
          },
        }),
      );
    });

    const submitterIds = getSubmitterIdsForStep(ticket, targetStep.code);
    const effortOwnerIds = this.coreService.getConfiguredEffortOwnerIds(ticket);
    const ccMemberIds = await this.coreService.getTicketCcMemberIds(ticket.id, {
      orgId,
      excluded: [ticket.requesterId, ticket.delegateId, ...effortOwnerIds],
    });
    void this.coreService.notifyUsers(
      this.filterUserIds([
        ...submitterIds,
        ticket.requesterId,
        ...ccMemberIds,
      ]).filter((userId) => userId !== actorId),
      `[Ticket ${ticket.code}] Changes requested`,
      `Ticket was sent back for revision.`,
      {
        ticket,
        actorId,
        action,
      },
    );

    return this.coreService.getTicketDetail(ticket.id, orgId, actorId);
  }
}
