import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { OrganizationCoreService } from '@modules/organization/core/organization-core.service';
import { ProjectCoreService } from '@modules/project/core/project-core.service';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { RbacService } from '@modules/rbac/rbac.service';
import { MaillerService } from '@modules/mail/mail.service';
import { NotificationCoreService } from '@modules/notification/core/notification-core.service';
import {
  TicketRequestUpdatedWsPayload,
  WsEvents,
} from '@modules/websocket/types';
import { WebsocketService } from '@modules/websocket/websocket.service';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';
import { DEFAULT_TIMEZONE } from '@common/constants/timezone.constant';
import { PaginationHelper } from '@common/helpers/pagination.helper';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { SortOrder } from '@common/dto/pagination.request';
import {
  PERMISSIONS,
  SYSTEM_ROLES,
} from '@modules/rbac/constant/permission.constant';

import {
  TicketRequest,
  TicketRequestStatus,
  TicketRequestType,
  TicketRequestWorkflowCode,
  TicketRequestWorkflowStepCode,
} from './entities/ticket-request.entity';
import {
  TicketRequestNotificationContext,
  getNextStepOrThrow,
  getWorkflowDefinition,
  getWorkflowStep,
} from '../ticket-request-workflow-engine';
import { TicketRequestCcMember } from './entities/ticket-request-cc-member.entity';
import { TicketRequestComment } from './entities/ticket-request-comment.entity';
import {
  TicketRequestActivity,
  TicketRequestActivityAction,
} from './entities/ticket-request-activity.entity';

import { CreateTicketRequestRequest } from './dto/request/create-ticket-request.request';
import { CreateOvertimeRequestRequest } from './dto/request/create-overtime-request.request';
import { ListTicketRequestsRequest } from './dto/request/list-ticket-requests.request';
import {
  TicketRequestActivityResponse,
  TicketRequestDelegateOptionResponse,
  TicketRequestCcMemberResponse,
  TicketRequestDetailResponse,
  TicketRequestSummaryResponse,
  TicketRequestUserRaw,
  TicketRequestUserResponse,
} from './dto/response/ticket-request.response';
import {
  TICKET_REQUEST_DISPLAY_TYPE_MAP,
  TICKET_REQUEST_DISPLAY_TYPE_OPTIONS,
  TICKET_REQUEST_REASON_MAP,
  TICKET_REQUEST_REASON_OPTIONS,
  TicketRequestDisplayTypeOption,
  TicketRequestReasonOption,
} from './constants/request-type-catalog.constant';

@Injectable()
export class TicketRequestCoreService {
  readonly logger = new Logger(TicketRequestCoreService.name);

  constructor(
    @InjectRepository(TicketRequest)
    readonly ticketRepo: Repository<TicketRequest>,

    @InjectRepository(TicketRequestCcMember)
    readonly ccMemberRepo: Repository<TicketRequestCcMember>,

    @InjectRepository(TicketRequestComment)
    readonly commentRepo: Repository<TicketRequestComment>,

    @InjectRepository(TicketRequestActivity)
    readonly activityRepo: Repository<TicketRequestActivity>,

    @InjectRepository(OrganizationMember)
    readonly memberRepo: Repository<OrganizationMember>,

    @InjectRepository(User)
    readonly userRepo: Repository<User>,

    readonly dataSource: DataSource,
    private readonly organizationCoreService: OrganizationCoreService,
    readonly rbacService: RbacService,
    readonly mailService: MaillerService,
    readonly notificationCoreService: NotificationCoreService,
    readonly websocketService: WebsocketService,
    private readonly projectCoreService: ProjectCoreService,
  ) {}

  getRequestTypeOptions(): TicketRequestDisplayTypeOption[] {
    return TICKET_REQUEST_DISPLAY_TYPE_OPTIONS;
  }

  getReasonOptions(): TicketRequestReasonOption[] {
    return TICKET_REQUEST_REASON_OPTIONS;
  }

  async getCcMemberOptions(
    orgId: string,
    userId: string,
  ): Promise<TicketRequestUserResponse[]> {
    await this.ensureOrganization(orgId);
    await this.ensureActiveMember(orgId, userId);

    const memberIds = await this.getActiveOrganizationMemberIds(orgId);
    const eligibleIds = memberIds.filter((id) => id !== userId);

    if (eligibleIds.length === 0) return [];

    const userMap = await this.loadUserMap(eligibleIds);

    return eligibleIds
      .map((id) => TicketRequestUserResponse.fromRaw(userMap.get(id)))
      .filter((u): u is TicketRequestUserResponse => !!u);
  }

  async getDelegateOptions(
    orgId: string,
    userId: string,
  ): Promise<TicketRequestDelegateOptionResponse[]> {
    await this.ensureOrganization(orgId);
    await this.ensureActiveMember(orgId, userId);

    const [delegateIds, orgAdminMemberIds, requesterCanDelegate] =
      await Promise.all([
        this.getEligibleDelegateIds(orgId),
        this.getOrganizationAdminMemberIds(orgId),
        this.rbacService.hasPermission(
          userId,
          PERMISSIONS.TICKET_REQUESTS.DELEGATE,
          orgId,
        ),
      ]);

    const orgAdminSet = new Set(orgAdminMemberIds);
    const defaultDelegateId = requesterCanDelegate
      ? delegateIds.find((id) => orgAdminSet.has(id))
      : undefined;

    const userMap = await this.loadUserMap(delegateIds);

    const options = delegateIds
      .map((id) => {
        const user = TicketRequestUserResponse.fromRaw(userMap.get(id));
        if (!user) return null;

        return {
          ...user,
          isOrgAdmin: orgAdminSet.has(id),
          isDefault: id === defaultDelegateId,
        };
      })
      .filter((item): item is TicketRequestDelegateOptionResponse => !!item);

    options.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

    return options;
  }

  async createTicket(
    orgId: string,
    requesterId: string,
    dto: CreateTicketRequestRequest,
  ): Promise<TicketRequestDetailResponse> {
    await this.ensureOrganization(orgId);
    await this.ensureActiveMember(orgId, requesterId);

    const requestTypeInput = this.resolveRequestDisplayTypeInput(
      dto.requestTypeCode,
      dto.requestTypeName,
      dto.type,
      dto.workflowCode,
    );

    const workflowCode = requestTypeInput.workflowCode;

    if (requestTypeInput.type === TicketRequestType.OVERTIME) {
      const canCreateOvertime = await this.rbacService.hasPermission(
        requesterId,
        PERMISSIONS.TICKET_REQUESTS.CREATE_OVERTIME,
        orgId,
      );
      if (!canCreateOvertime) {
        throw new ForbiddenException(
          'You do not have permission to create overtime requests',
        );
      }
    }

    const workflow = getWorkflowDefinition(workflowCode);
    const createStep = getWorkflowStep(workflowCode, workflow.createStepCode);
    const firstApprovalStep = getNextStepOrThrow(workflowCode, createStep);

    const selectedDelegateId = await this.resolveDelegate(
      orgId,
      requesterId,
      dto.delegateId,
    );

    const effortOwnerId = dto.effortOwnerId ?? requesterId;

    await this.ensureMembersExist(orgId, [selectedDelegateId, effortOwnerId]);

    const excludedCcMemberIds = [
      requesterId,
      selectedDelegateId,
      effortOwnerId,
    ];
    const defaultCcMemberIds = await this.getDefaultCcMemberIds(
      orgId,
      excludedCcMemberIds,
    );
    const requestedCcMemberIds = this.sanitizeCcMemberIds(
      dto.ccMemberIds,
      excludedCcMemberIds,
    );
    const sanitizedCcMemberIds = [
      ...new Set([...requestedCcMemberIds, ...defaultCcMemberIds]),
    ];

    if (sanitizedCcMemberIds.length > 0) {
      await this.ensureMembersExist(orgId, sanitizedCcMemberIds);
    }

    this.validateReasonCode(dto.reasonCode);

    const startAt = this.parseOptionalDate(dto.startAt);
    const endAt = this.parseOptionalDate(dto.endAt);
    this.validateDateRange(startAt, endAt);

    const ticket = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TicketRequest);
      const code = await this.generateTicketCode(orgId, repo);

      const created = manager.create(TicketRequest, {
        organizationId: orgId,
        code,
        type: requestTypeInput.type,
        workflowCode,
        currentStepCode: firstApprovalStep.code,
        currentStepOrder: firstApprovalStep.order,
        title: dto.title,
        content: dto.content,
        requestTypeCode: requestTypeInput.code,
        requestTypeName: requestTypeInput.label,
        reasonCode: dto.reasonCode,
        reasonDetail: dto.reasonDetail,
        requesterId,
        effortOwnerId,
        delegateId: selectedDelegateId,
        startAt,
        endAt,
        status: TicketRequestStatus.PENDING_APPROVAL,
      });
      const saved = await manager.save(created);

      if (sanitizedCcMemberIds.length > 0) {
        await manager.save(
          TicketRequestCcMember,
          sanitizedCcMemberIds.map((memberId) =>
            manager.create(TicketRequestCcMember, {
              ticketRequestId: saved.id,
              memberId,
              addedBy: requesterId,
            }),
          ),
        );
      }

      await manager.save(
        TicketRequestActivity,
        manager.create(TicketRequestActivity, {
          ticketRequestId: saved.id,
          actorId: requesterId,
          action: TicketRequestActivityAction.CREATED,
          toStatus: TicketRequestStatus.PENDING_APPROVAL,
          payload: {
            workflowCode,
            currentStepCode: createStep.code,
          },
        }),
      );

      await manager.save(
        TicketRequestActivity,
        manager.create(TicketRequestActivity, {
          ticketRequestId: saved.id,
          actorId: requesterId,
          action: TicketRequestActivityAction.SUBMITTED,
          toStatus: TicketRequestStatus.PENDING_APPROVAL,
          payload: {
            fromStepCode: createStep.code,
            toStepCode: firstApprovalStep.code,
            nextDelegateId: selectedDelegateId,
          },
        }),
      );

      return saved;
    });

    void this.notifyUsers(
      [selectedDelegateId, effortOwnerId, ...sanitizedCcMemberIds].filter(
        (userId) => userId !== requesterId,
      ),
      `[Ticket ${ticket.code}] New ticket request`,
      `A new ticket request has been submitted and needs your attention.`,
      {
        ticket,
        actorId: requesterId,
        action: TicketRequestActivityAction.CREATED,
      },
    );

    return this.getTicketDetail(ticket.id, orgId, requesterId);
  }

  async createOvertimeTicket(
    orgId: string,
    requesterId: string,
    dto: CreateOvertimeRequestRequest,
  ): Promise<TicketRequestDetailResponse> {
    await this.ensureOrganization(orgId);
    await this.ensureActiveMember(orgId, requesterId);

    // --- Project validations ---
    const project = await this.projectCoreService.getProjectEntity(
      dto.projectId,
      orgId,
    );
    await this.projectCoreService.ensureUserInProject(
      dto.projectId,
      orgId,
      requesterId,
      { allowOrgAdmin: true },
    );
    await this.projectCoreService.ensureUserCanCreateOvertimeRequest(
      dto.projectId,
      orgId,
      requesterId,
    );

    const workflowCode = TicketRequestWorkflowCode.OVERTIME_STANDARD_DIRECT;

    const workflow = getWorkflowDefinition(workflowCode);
    const createStep = getWorkflowStep(workflowCode, workflow.createStepCode);
    const firstApprovalStep = getNextStepOrThrow(workflowCode, createStep);

    const [eligibleIds, orgAdminIds] = await Promise.all([
      this.getEligibleDelegateIds(orgId),
      this.getOrganizationAdminMemberIds(orgId),
    ]);
    const orgAdminSet = new Set(orgAdminIds);
    const orgAdminDelegateId = eligibleIds.find((id) => orgAdminSet.has(id));
    if (!orgAdminDelegateId) {
      throw new ConflictException(
        'No org admin with delegate permission found to approve overtime ticket',
      );
    }

    const effortOwnerIds = this.resolveOvertimeEffortOwnerIds(dto, requesterId);
    await this.ensureMembersExist(orgId, effortOwnerIds);
    const orgAdminMemberIds = new Set(
      await this.getOrganizationAdminMemberIds(orgId),
    );
    const hasOrgAdminEffortOwner = effortOwnerIds.some((userId) =>
      orgAdminMemberIds.has(userId),
    );
    if (hasOrgAdminEffortOwner) {
      throw new ValidationException(
        ErrorCode.V000,
        'Organization admins cannot be selected as overtime effort owners',
      );
    }

    const projectMemberIds = new Set(
      await this.projectCoreService.getActiveProjectMemberUserIds(
        dto.projectId,
        orgId,
      ),
    );
    const hasInvalidEffortOwner = effortOwnerIds.some(
      (userId) => !projectMemberIds.has(userId),
    );
    if (hasInvalidEffortOwner) {
      throw new ValidationException(
        ErrorCode.V000,
        'All selected effort owners must be active members of the project',
      );
    }

    const excludedCcMemberIds = [
      requesterId,
      orgAdminDelegateId,
      ...effortOwnerIds,
    ];
    const requestedCcMemberIds = this.sanitizeCcMemberIds(
      dto.ccMemberIds,
      excludedCcMemberIds,
    );
    const hasInvalidCcMember = requestedCcMemberIds.some(
      (userId) => !projectMemberIds.has(userId),
    );
    if (hasInvalidCcMember) {
      throw new ValidationException(
        ErrorCode.V000,
        'All selected CC members must be active members of the project',
      );
    }

    const defaultCcMemberIds = (
      await this.getDefaultCcMemberIds(orgId, excludedCcMemberIds)
    ).filter((userId) => projectMemberIds.has(userId));
    const sanitizedCcMemberIds = [
      ...new Set([...requestedCcMemberIds, ...defaultCcMemberIds]),
    ];

    if (sanitizedCcMemberIds.length > 0) {
      await this.ensureMembersExist(orgId, sanitizedCcMemberIds);
    }

    const startAt = this.parseOptionalDate(dto.startAt);
    const endAt = this.parseOptionalDate(dto.endAt);
    this.validateDateRange(startAt, endAt);
    this.validateOvertimePlannedHours(dto.plannedHours, startAt, endAt);

    const tickets = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TicketRequest);
      const splitGroupId = effortOwnerIds.length > 1 ? randomUUID() : undefined;
      const createdTickets: TicketRequest[] = [];

      for (const effortOwnerId of effortOwnerIds) {
        const code = await this.generateTicketCode(orgId, repo);
        const created = manager.create(TicketRequest, {
          organizationId: orgId,
          code,
          type: TicketRequestType.OVERTIME,
          workflowCode,
          currentStepCode: firstApprovalStep.code,
          currentStepOrder: firstApprovalStep.order,
          title: dto.title,
          content: dto.scope ?? '',
          requestTypeCode: 'overtime_request',
          requestTypeName: 'Overtime request',
          reasonCode: dto.reasonCode,
          reasonDetail: dto.reasonDetail,
          requesterId,
          effortOwnerId,
          delegateId: orgAdminDelegateId,
          startAt,
          endAt,
          status: TicketRequestStatus.PENDING_APPROVAL,
          otMetadata: {
            projectId: dto.projectId,
            projectName: project.name,
            plannedHours: dto.plannedHours,
            scope: dto.scope,
            effortOwnerIds: [effortOwnerId],
            groupEffortOwnerIds:
              effortOwnerIds.length > 1 ? [...effortOwnerIds] : undefined,
            splitGroupId,
            splitFromMultiOwner: effortOwnerIds.length > 1,
          },
        });
        const saved = await manager.save(created);

        if (sanitizedCcMemberIds.length > 0) {
          await manager.save(
            TicketRequestCcMember,
            sanitizedCcMemberIds.map((memberId) =>
              manager.create(TicketRequestCcMember, {
                ticketRequestId: saved.id,
                memberId,
                addedBy: requesterId,
              }),
            ),
          );
        }

        await manager.save(
          TicketRequestActivity,
          manager.create(TicketRequestActivity, {
            ticketRequestId: saved.id,
            actorId: requesterId,
            action: TicketRequestActivityAction.CREATED,
            toStatus: TicketRequestStatus.PENDING_APPROVAL,
            payload: {
              workflowCode,
              currentStepCode: createStep.code,
              splitGroupId,
              effortOwnerId,
            },
          }),
        );

        await manager.save(
          TicketRequestActivity,
          manager.create(TicketRequestActivity, {
            ticketRequestId: saved.id,
            actorId: requesterId,
            action: TicketRequestActivityAction.SUBMITTED,
            toStatus: TicketRequestStatus.PENDING_APPROVAL,
            payload: {
              fromStepCode: createStep.code,
              toStepCode: firstApprovalStep.code,
              nextDelegateId: orgAdminDelegateId,
              splitGroupId,
              effortOwnerId,
            },
          }),
        );

        createdTickets.push(saved);
      }

      return createdTickets;
    });

    for (const ticket of tickets) {
      void this.notifyUsers(
        [orgAdminDelegateId, ticket.effortOwnerId, ...sanitizedCcMemberIds]
          .filter((userId): userId is string => Boolean(userId))
          .filter((userId) => userId !== requesterId),
        `[Ticket ${ticket.code}] New overtime request`,
        `A new overtime ticket request has been submitted and needs your attention.`,
        {
          ticket,
          actorId: requesterId,
          action: TicketRequestActivityAction.CREATED,
        },
      );
    }

    const primaryTicket =
      tickets.find((ticket) => ticket.effortOwnerId === requesterId) ??
      tickets[0];

    return this.getTicketDetail(primaryTicket.id, orgId, requesterId);
  }

  async getOtEffortOwnerOptions(
    orgId: string,
    userId: string,
    projectId?: string,
  ): Promise<TicketRequestUserResponse[]> {
    await this.ensureOrganization(orgId);
    await this.ensureActiveMember(orgId, userId);

    let memberUserIds: string[];
    const orgAdminIds = new Set(
      await this.getOrganizationAdminMemberIds(orgId),
    );

    if (projectId) {
      await this.projectCoreService.getProjectEntity(projectId, orgId);
      await this.projectCoreService.ensureUserInProject(
        projectId,
        orgId,
        userId,
        { allowOrgAdmin: true },
      );
      await this.projectCoreService.ensureUserCanCreateOvertimeRequest(
        projectId,
        orgId,
        userId,
      );
      memberUserIds =
        await this.projectCoreService.getActiveProjectMemberUserIds(
          projectId,
          orgId,
        );
    } else {
      memberUserIds = await this.getActiveOrganizationMemberIds(orgId);
    }

    const eligibleMemberUserIds = memberUserIds.filter(
      (id) => !orgAdminIds.has(id),
    );

    if (eligibleMemberUserIds.length === 0) return [];

    const userMap = await this.loadUserMap(eligibleMemberUserIds);
    return eligibleMemberUserIds
      .map((id) => TicketRequestUserResponse.fromRaw(userMap.get(id)))
      .filter((u): u is TicketRequestUserResponse => !!u);
  }

  async getOtProjectOptions(
    orgId: string,
    userId: string,
  ): Promise<{ id: string; name: string }[]> {
    await this.ensureOrganization(orgId);
    await this.ensureActiveMember(orgId, userId);
    return this.projectCoreService.getProjectsEligibleForOvertimeRequest(
      orgId,
      userId,
    );
  }

  async getMyTickets(
    orgId: string,
    userId: string,
    query: ListTicketRequestsRequest,
  ): Promise<PaginatedResponse<TicketRequestSummaryResponse>> {
    await this.ensureOrganization(orgId);
    await this.ensureActiveMember(orgId, userId);

    const qb = this.ticketRepo
      .createQueryBuilder('tr')
      .leftJoin(TicketRequestCcMember, 'cc', 'cc.ticket_request_id = tr.id')
      .where('tr.organization_id = :orgId', { orgId })
      .andWhere('tr.deleted_at IS NULL')
      .andWhere(
        `(
          tr.requester_id = :userId
          OR tr.delegate_id = :userId
          OR tr.effort_owner_id = :userId
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(
              COALESCE(tr.ot_metadata->'effortOwnerIds', '[]'::jsonb)
            ) AS effort_owner(value)
            WHERE effort_owner.value = :userIdText
          )
          OR cc.member_id = :userId
        )`,
        { userId, userIdText: userId },
      )
      .distinct(true);

    this.applyListFilters(qb, query);

    return this.getPaginatedTicketSummaries(qb, query);
  }

  async getManageTickets(
    orgId: string,
    query: ListTicketRequestsRequest,
  ): Promise<PaginatedResponse<TicketRequestSummaryResponse>> {
    await this.ensureOrganization(orgId);

    const qb = this.ticketRepo
      .createQueryBuilder('tr')
      .where('tr.organization_id = :orgId', { orgId })
      .andWhere('tr.deleted_at IS NULL');

    this.applyListFilters(qb, query);

    return this.getPaginatedTicketSummaries(qb, query);
  }

  async getTicketDetail(
    ticketId: string,
    orgId: string,
    callerId: string,
  ): Promise<TicketRequestDetailResponse> {
    await this.ensureOrganization(orgId);

    const ticket = await this.getTicketOrThrow(ticketId, orgId);
    await this.ensureUserCanViewTicket(ticket, callerId, orgId);

    return this.buildTicketDetail(ticket);
  }

  async cancelTicket(
    ticketId: string,
    orgId: string,
    requesterId: string,
  ): Promise<TicketRequestDetailResponse> {
    const ticket = await this.getTicketOrThrow(ticketId, orgId);

    if (ticket.requesterId !== requesterId) {
      throw new ForbiddenException('Only requester can cancel this ticket');
    }

    if (
      ![
        TicketRequestStatus.PENDING_APPROVAL,
        TicketRequestStatus.PENDING_SUBMISSION,
        TicketRequestStatus.CHANGES_REQUESTED,
      ].includes(ticket.status)
    ) {
      throw new ConflictException(
        'This ticket cannot be canceled in current status',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const fromStatus = ticket.status;
      ticket.status = TicketRequestStatus.CANCELED;
      ticket.currentStepCode = TicketRequestWorkflowStepCode.CANCELED;
      ticket.canceledAt = new Date();
      ticket.canceledBy = requesterId;

      await manager.getRepository(TicketRequest).save(ticket);

      await manager.save(
        TicketRequestActivity,
        manager.create(TicketRequestActivity, {
          ticketRequestId: ticket.id,
          actorId: requesterId,
          action: TicketRequestActivityAction.CANCELED,
          fromStatus,
          toStatus: TicketRequestStatus.CANCELED,
          payload: {
            toStepCode: TicketRequestWorkflowStepCode.CANCELED,
          },
        }),
      );
    });

    const effortOwnerIds = this.getConfiguredEffortOwnerIds(ticket);
    const ccMemberIds = await this.getTicketCcMemberIds(ticket.id, {
      orgId,
      excluded: [ticket.requesterId, ticket.delegateId, ...effortOwnerIds],
    });
    void this.notifyUsers(
      [ticket.delegateId, ...effortOwnerIds, ...ccMemberIds].filter(Boolean),
      `[Ticket ${ticket.code}] Ticket canceled`,
      `The ticket request was canceled by requester.`,
      {
        ticket,
        actorId: requesterId,
        action: TicketRequestActivityAction.CANCELED,
      },
    );

    return this.getTicketDetail(ticket.id, orgId, requesterId);
  }

  // ─── Shared helpers (used by workflow/comment/cc-member services) ───

  async ensureOrganization(orgId: string): Promise<void> {
    await this.organizationCoreService.getOrganizationById(orgId);
  }

  async getTicketOrThrow(
    ticketId: string,
    orgId: string,
  ): Promise<TicketRequest> {
    const ticket = await this.ticketRepo.findOne({
      where: {
        id: ticketId,
        organizationId: orgId,
        deletedAt: IsNull(),
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket request not found');
    }

    return ticket;
  }

  async ensureActiveMember(orgId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: {
        organizationId: orgId,
        userId,
        isActive: true,
        isDeleted: false,
      },
    });

    if (!member) {
      throw new ValidationException(ErrorCode.O003);
    }
  }

  async ensureMembersExist(
    orgId: string,
    userIds: Array<string | undefined>,
  ): Promise<void> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return;

    const members = await this.memberRepo.find({
      where: {
        organizationId: orgId,
        userId: In(unique),
        isActive: true,
        isDeleted: false,
      },
      select: ['userId'],
    });

    if (members.length !== unique.length) {
      throw new ValidationException(
        ErrorCode.O003,
        'One or more users are not active members in this organization',
      );
    }
  }

  async ensureUserCanViewTicket(
    ticket: TicketRequest,
    userId: string,
    orgId: string,
  ): Promise<void> {
    const effortOwnerIds = this.getConfiguredEffortOwnerIds(ticket);
    if (
      ticket.requesterId === userId ||
      ticket.delegateId === userId ||
      effortOwnerIds.includes(userId)
    ) {
      return;
    }

    const cc = await this.ccMemberRepo.findOne({
      where: {
        ticketRequestId: ticket.id,
        memberId: userId,
      },
    });

    if (cc) return;

    const canViewAll = await this.rbacService.hasPermission(
      userId,
      PERMISSIONS.TICKET_REQUESTS.LIST_ORG,
      orgId,
    );

    if (!canViewAll) {
      throw new ForbiddenException('You are not allowed to view this ticket');
    }
  }

  async resolveDelegate(
    orgId: string,
    requesterId: string,
    candidateId?: string,
  ): Promise<string> {
    if (candidateId) {
      if (candidateId === requesterId) {
        throw new ForbiddenException(
          'Requester cannot approve own ticket request',
        );
      }
      await this.ensureUserCanBeDelegate(orgId, candidateId);
      return candidateId;
    }

    // Không truyền delegateId → chỉ cho phép nếu requester có delegate permission
    const requesterCanDelegate = await this.rbacService.hasPermission(
      requesterId,
      PERMISSIONS.TICKET_REQUESTS.DELEGATE,
      orgId,
    );

    if (!requesterCanDelegate) {
      throw new ValidationException(ErrorCode.V000, 'delegateId is required');
    }

    // Tự động chọn org admin có delegate permission
    const [eligibleIds, orgAdminIds] = await Promise.all([
      this.getEligibleDelegateIds(orgId),
      this.getOrganizationAdminMemberIds(orgId),
    ]);
    const orgAdminSet = new Set(orgAdminIds);
    const autoDelegate = eligibleIds.find(
      (id) => orgAdminSet.has(id) && id !== requesterId,
    );

    if (!autoDelegate) {
      throw new ValidationException(
        ErrorCode.V000,
        'No org admin available to approve this ticket',
      );
    }

    return autoDelegate;
  }

  async ensureUserCanBeDelegate(orgId: string, userId: string): Promise<void> {
    const hasDelegatePermission = await this.rbacService.hasPermission(
      userId,
      PERMISSIONS.TICKET_REQUESTS.DELEGATE,
      orgId,
    );

    if (!hasDelegatePermission) {
      throw new ValidationException(
        ErrorCode.V000,
        'Selected delegate must have permission ticket_requests.delegate',
      );
    }
  }

  async getTicketCcMemberIds(
    ticketId: string,
    options?: { orgId: string; excluded: string[] },
  ): Promise<string[]> {
    const ccMembers = await this.ccMemberRepo.find({
      where: {
        ticketRequestId: ticketId,
      },
      select: ['memberId'],
    });

    const ccMemberIds = ccMembers.map((item) => item.memberId);

    if (!options) {
      return ccMemberIds;
    }

    const defaultCcMemberIds = await this.getDefaultCcMemberIds(
      options.orgId,
      options.excluded,
    );

    return [...new Set([...ccMemberIds, ...defaultCcMemberIds])];
  }

  async getWatcherIds(
    ticket: TicketRequest,
    ticketId: string,
  ): Promise<string[]> {
    const effortOwnerIds = this.getConfiguredEffortOwnerIds(ticket);
    const ccMemberIds = await this.getTicketCcMemberIds(ticketId, {
      orgId: ticket.organizationId,
      excluded: [ticket.requesterId, ticket.delegateId, ...effortOwnerIds],
    });

    return [
      ...new Set([
        ticket.requesterId,
        ticket.delegateId,
        ...effortOwnerIds,
        ...ccMemberIds,
      ]),
    ].filter(Boolean) as string[];
  }

  async getActiveOrganizationMemberIds(orgId: string): Promise<string[]> {
    const members = await this.memberRepo.find({
      where: {
        organizationId: orgId,
        isActive: true,
        isDeleted: false,
      },
      select: ['userId'],
    });

    return [...new Set(members.map((item) => item.userId))];
  }

  async getEligibleDelegateIds(orgId: string): Promise<string[]> {
    const [memberIds, delegateIds] = await Promise.all([
      this.getActiveOrganizationMemberIds(orgId),
      this.rbacService.getUserIdsWithPermission(
        orgId,
        PERMISSIONS.TICKET_REQUESTS.DELEGATE,
      ),
    ]);

    if (memberIds.length === 0) return [];

    const memberSet = new Set(memberIds);
    return delegateIds.filter((id) => memberSet.has(id)) as string[];
  }

  async getOrganizationAdminMemberIds(orgId: string): Promise<string[]> {
    const [memberIds, adminIds] = await Promise.all([
      this.getActiveOrganizationMemberIds(orgId),
      this.rbacService.getUserIdsWithRole(orgId, SYSTEM_ROLES.ORG_ADMIN),
    ]);

    if (memberIds.length === 0) return [];

    const memberSet = new Set(memberIds);
    return adminIds.filter((id) => memberSet.has(id)) as string[];
  }

  async getDefaultCcMemberIds(
    orgId: string,
    excluded: string[],
  ): Promise<string[]> {
    const orgAdminMemberIds = await this.getOrganizationAdminMemberIds(orgId);
    return this.sanitizeCcMemberIds(orgAdminMemberIds, excluded);
  }

  async loadUserMap(
    userIds: Array<string | undefined>,
  ): Promise<Map<string, TicketRequestUserRaw>> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map();

    const users = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.email', 'u.firstName', 'u.lastName'])
      .where('u.id IN (:...ids)', { ids: uniqueIds })
      .andWhere('u.deleted_at IS NULL')
      .getMany();

    const map = new Map<string, TicketRequestUserRaw>();

    for (const user of users) {
      map.set(user.id, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    }

    return map;
  }

  sanitizeCcMemberIds(ids: string[] = [], excluded: string[]): string[] {
    const excludedSet = new Set(excluded);
    return [...new Set(ids)].filter((id) => !excludedSet.has(id));
  }

  parseOptionalDate(value?: string): Date | undefined {
    if (!value) return undefined;
    return new Date(value);
  }

  getConfiguredEffortOwnerIds(ticket: TicketRequest): string[] {
    const metadataIds = Array.isArray(ticket.otMetadata?.effortOwnerIds)
      ? ticket.otMetadata.effortOwnerIds
      : [];

    const fallbackIds = ticket.effortOwnerId ? [ticket.effortOwnerId] : [];

    return [...new Set([...metadataIds, ...fallbackIds].filter(Boolean))];
  }

  validateDateRange(startAt?: Date, endAt?: Date): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startAt && startAt.getTime() < today.getTime()) {
      throw new ValidationException(
        ErrorCode.V005,
        'startAt cannot be in the past',
      );
    }

    if (endAt && endAt.getTime() < today.getTime()) {
      throw new ValidationException(
        ErrorCode.V005,
        'endAt cannot be in the past',
      );
    }

    if (!startAt || !endAt) return;

    if (startAt.getTime() > endAt.getTime()) {
      throw new ValidationException(
        ErrorCode.V005,
        'startAt must be less than or equal to endAt',
      );
    }
  }

  validateOvertimePlannedHours(
    plannedHours?: number,
    startAt?: Date,
    endAt?: Date,
  ): void {
    if (
      plannedHours == null ||
      !Number.isFinite(plannedHours) ||
      !startAt ||
      !endAt
    ) {
      return;
    }

    const scheduledDayCount = this.getInclusiveLocalDayCount(startAt, endAt);
    const maxPlannedHours = scheduledDayCount * 4;

    if (plannedHours > maxPlannedHours) {
      throw new ValidationException(
        ErrorCode.V005,
        `plannedHours cannot exceed ${maxPlannedHours} hours for the selected schedule`,
      );
    }
  }

  private getInclusiveLocalDayCount(startAt: Date, endAt: Date): number {
    const startDate = this.formatDateInTimeZone(startAt, DEFAULT_TIMEZONE);
    const endDate = this.formatDateInTimeZone(endAt, DEFAULT_TIMEZONE);
    const diffDays = Math.floor(
      (this.parseDateOnly(endDate).getTime() -
        this.parseDateOnly(startDate).getTime()) /
        86_400_000,
    );

    return Math.max(diffDays + 1, 1);
  }

  private formatDateInTimeZone(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  validateReasonCode(reasonCode?: string): void {
    if (!reasonCode) return;

    if (!TICKET_REQUEST_REASON_MAP.has(reasonCode)) {
      throw new ValidationException(
        ErrorCode.V000,
        'reason code is not supported',
      );
    }
  }

  resolveRequestDisplayTypeInput(
    requestTypeCode?: string,
    requestTypeName?: string,
    type?: TicketRequestType,
    workflowCode?: TicketRequestWorkflowCode,
  ): {
    code: string;
    label: string;
    type: TicketRequestType;
    workflowCode: TicketRequestWorkflowCode;
  } {
    let option: TicketRequestDisplayTypeOption | undefined;

    if (requestTypeCode) {
      option = TICKET_REQUEST_DISPLAY_TYPE_MAP.get(requestTypeCode);
      if (!option) {
        throw new ValidationException(
          ErrorCode.V000,
          'request type code is not supported',
        );
      }
    }

    if (!option && requestTypeName) {
      option = TICKET_REQUEST_DISPLAY_TYPE_OPTIONS.find(
        (item) => item.label.toLowerCase() === requestTypeName.toLowerCase(),
      );
    }

    if (!option && type) {
      option = TICKET_REQUEST_DISPLAY_TYPE_OPTIONS.find(
        (item) => item.type === type && item.code === `${type}_request`,
      );

      if (!option) {
        option = TICKET_REQUEST_DISPLAY_TYPE_OPTIONS.find(
          (item) => item.type === type,
        );
      }
    }

    if (!option) {
      throw new ValidationException(
        ErrorCode.V000,
        'Request type code/name is not supported',
      );
    }

    if (type && option.type !== type) {
      throw new ValidationException(
        ErrorCode.V000,
        'request type does not match base ticket type',
      );
    }

    if (option?.isCustom) {
      if (!requestTypeName?.trim()) {
        throw new ValidationException(
          ErrorCode.V000,
          `requestTypeName is required when requestTypeCode is ${option.code}`,
        );
      }

      const resolvedWorkflowCode = workflowCode ?? option.defaultWorkflowCode;
      if (!option.allowedWorkflowCodes.includes(resolvedWorkflowCode)) {
        throw new ValidationException(
          ErrorCode.V000,
          'workflow is not allowed for selected request type',
        );
      }

      return {
        code: option.code,
        label: requestTypeName.trim(),
        type: option.type,
        workflowCode: resolvedWorkflowCode,
      };
    }

    const resolvedWorkflowCode = workflowCode ?? option.defaultWorkflowCode;

    if (!option.allowedWorkflowCodes.includes(resolvedWorkflowCode)) {
      throw new ValidationException(
        ErrorCode.V000,
        'workflow is not allowed for selected request type',
      );
    }

    return {
      code: option.code,
      label: option.label,
      type: option.type,
      workflowCode: resolvedWorkflowCode,
    };
  }

  async notifyUsers(
    userIds: Array<string | undefined>,
    subject: string,
    message: string,
    context?: TicketRequestNotificationContext,
  ): Promise<void> {
    try {
      const uniqueUserIds = [...new Set(userIds.filter(Boolean))] as string[];
      if (uniqueUserIds.length === 0) return;

      const users = await this.userRepo.find({
        where: {
          id: In(uniqueUserIds),
          deletedAt: IsNull(),
        },
        select: ['id', 'email'],
      });

      if (users.length === 0) {
        return;
      }

      const recipientIds = users.map((user) => user.id);

      const emailTasks = users.map(
        (user) =>
          this.mailService.sendTicketRequestNotification(
            user.email ?? '',
            subject,
            message,
          ) as unknown as Promise<void>,
      );

      const notificationTasks =
        context?.ticket && context.actorId
          ? recipientIds.map((userId) =>
              this.notificationCoreService.send({
                userId,
                type: 'ticket_request',
                title: subject,
                message,
                senderId: context.actorId,
                data: {
                  module: 'ticket_request',
                  ticketId: context.ticket.id,
                  ticketCode: context.ticket.code,
                  organizationId: context.ticket.organizationId,
                  action: context.action,
                  status: context.ticket.status,
                  currentStepCode: context.ticket.currentStepCode,
                  ...(context.data ?? {}),
                },
              }),
            )
          : [];

      await Promise.allSettled([...emailTasks, ...notificationTasks]);

      if (context?.ticket && context.actorId) {
        this.emitTicketRealtime(
          [...new Set([...recipientIds, context.actorId])],
          subject,
          message,
          context,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to dispatch ticket request notifications',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  emitTicketRealtime(
    userIds: string[],
    title: string,
    message: string,
    context: TicketRequestNotificationContext,
  ): void {
    if (userIds.length === 0) {
      return;
    }

    const payload: TicketRequestUpdatedWsPayload = {
      ticketId: context.ticket.id,
      code: context.ticket.code,
      organizationId: context.ticket.organizationId,
      action: context.action as TicketRequestUpdatedWsPayload['action'],
      actorId: context.actorId,
      status: context.ticket.status as TicketRequestUpdatedWsPayload['status'],
      currentStepCode: context.ticket.currentStepCode,
      title,
      message,
      data: context.data,
      occurredAt: new Date().toISOString(),
    };

    for (const userId of userIds) {
      this.websocketService.emitToUser(
        userId,
        WsEvents.TICKET_REQUEST_UPDATED,
        payload,
      );
    }
  }

  async generateTicketCode(
    orgId: string,
    repo: Repository<TicketRequest>,
  ): Promise<string> {
    const d = new Date();
    const datePart = `${d.getUTCFullYear()}${`${d.getUTCMonth() + 1}`.padStart(2, '0')}${`${d.getUTCDate()}`.padStart(2, '0')}`;

    for (let i = 0; i < 5; i += 1) {
      const suffix = `${Math.floor(Math.random() * 1000000)}`.padStart(6, '0');
      const code = `TR-${datePart}-${suffix}`;

      const existed = await repo.findOne({
        where: {
          organizationId: orgId,
          code,
        },
      });

      if (!existed) {
        return code;
      }
    }

    return `TR-${datePart}-${Date.now().toString().slice(-6)}`;
  }

  async getPaginatedTicketSummaries(
    qb: SelectQueryBuilder<TicketRequest>,
    query: ListTicketRequestsRequest,
  ): Promise<PaginatedResponse<TicketRequestSummaryResponse>> {
    const total = await qb.getCount();

    const { skip, take } = PaginationHelper.getSkipAndTake(query);

    const sortColumnMap: Record<string, string> = {
      createdAt: 'tr.createdAt',
      updatedAt: 'tr.updatedAt',
      status: 'tr.status',
    };

    const sortBy = sortColumnMap[query.sortBy ?? '']
      ? (query.sortBy as string)
      : 'createdAt';

    const sortOrder = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    const tickets = await qb
      .orderBy(sortColumnMap[sortBy], sortOrder)
      .skip(skip)
      .take(take)
      .getMany();

    const userIds = tickets.flatMap((item) => [
      item.requesterId,
      item.delegateId,
      ...this.getConfiguredEffortOwnerIds(item),
    ]);
    const userMap = await this.loadUserMap(userIds);

    const items = tickets.map((item) =>
      TicketRequestSummaryResponse.fromEntity(
        item,
        userMap.get(item.requesterId),
        item.delegateId ? userMap.get(item.delegateId) : undefined,
        this.getConfiguredEffortOwnerIds(item)
          .map((id) => userMap.get(id))
          .filter((user): user is TicketRequestUserRaw => !!user),
      ),
    );

    const meta = PaginationHelper.buildMeta(total, query);

    return new PaginatedResponse(items, meta);
  }

  applyListFilters(
    qb: SelectQueryBuilder<TicketRequest>,
    query: ListTicketRequestsRequest,
  ): void {
    if (query.status) {
      qb.andWhere('tr.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('tr.type = :type', { type: query.type });
    }
    if (query.requestTypeCode) {
      qb.andWhere('tr.request_type_code = :requestTypeCode', {
        requestTypeCode: query.requestTypeCode,
      });
    }

    if (query.workflowCode) {
      qb.andWhere('tr.workflow_code = :workflowCode', {
        workflowCode: query.workflowCode,
      });
    }

    if (query.currentStepCode) {
      qb.andWhere('tr.current_step_code = :currentStepCode', {
        currentStepCode: query.currentStepCode,
      });
    }

    if (query.requesterId) {
      qb.andWhere('tr.requester_id = :requesterId', {
        requesterId: query.requesterId,
      });
    }

    if (query.delegateId) {
      qb.andWhere('tr.delegate_id = :delegateId', {
        delegateId: query.delegateId,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(tr.code ILIKE :search OR tr.title ILIKE :search OR tr.content ILIKE :search OR tr.request_type_code ILIKE :search OR tr.request_type_name ILIKE :search OR tr.reason_code ILIKE :search)',
        {
          search: `%${query.search}%`,
        },
      );
    }

    if (query.fromDate) {
      qb.andWhere('tr.created_at >= :fromDate', {
        fromDate: this.parseOptionalDate(query.fromDate),
      });
    }

    if (query.toDate) {
      qb.andWhere('tr.created_at <= :toDate', {
        toDate: this.parseOptionalDate(query.toDate),
      });
    }
  }

  async buildTicketDetail(
    ticket: TicketRequest,
  ): Promise<TicketRequestDetailResponse> {
    const effortOwnerIds = this.getConfiguredEffortOwnerIds(ticket);
    const primaryEffortOwnerId = ticket.effortOwnerId ?? effortOwnerIds[0];
    const projectId = ticket.otMetadata?.projectId;
    const [ccMembers, activities, otProject] = await Promise.all([
      this.ccMemberRepo.find({
        where: {
          ticketRequestId: ticket.id,
        },
        order: { createdAt: 'ASC' },
      }),
      this.activityRepo.find({
        where: {
          ticketRequestId: ticket.id,
        },
        order: { createdAt: 'ASC' },
      }),
      projectId
        ? this.projectCoreService
            .getProjectEntity(projectId, ticket.organizationId)
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    const userIds = [
      ticket.requesterId,
      ticket.delegateId,
      ...effortOwnerIds,
      ...ccMembers.map((item) => item.memberId),
      ...ccMembers.map((item) => item.addedBy),
      ...activities.map((item) => item.actorId),
    ];

    const userMap = await this.loadUserMap(userIds);

    const base = TicketRequestSummaryResponse.fromEntity(
      ticket,
      userMap.get(ticket.requesterId),
      ticket.delegateId ? userMap.get(ticket.delegateId) : undefined,
      effortOwnerIds
        .map((id) => userMap.get(id))
        .filter((user): user is TicketRequestUserRaw => !!user),
    );

    return {
      ...base,
      content: ticket.content,
      reasonDetail: ticket.reasonDetail,
      effortOwner: primaryEffortOwnerId
        ? (userMap.get(primaryEffortOwnerId) ?? null)
        : null,
      effortOwners: effortOwnerIds
        .map((id) => userMap.get(id))
        .filter((user): user is TicketRequestUserRaw => !!user),
      startAt: ticket.startAt,
      endAt: ticket.endAt,
      decisionNote: ticket.decisionNote,
      decidedAt: ticket.decidedAt,
      decidedBy: ticket.decidedBy,
      canceledAt: ticket.canceledAt,
      canceledBy: ticket.canceledBy,
      otMetadata: ticket.otMetadata
        ? { ...ticket.otMetadata, projectName: otProject?.name ?? undefined }
        : undefined,
      ccMembers: ccMembers.map(
        (item): TicketRequestCcMemberResponse => ({
          member: userMap.get(item.memberId)!,
          addedAt: item.createdAt,
          addedBy: userMap.get(item.addedBy) ?? null,
        }),
      ),
      activities: activities.map(
        (item): TicketRequestActivityResponse => ({
          id: item.id,
          action: item.action,
          fromStatus: item.fromStatus,
          toStatus: item.toStatus,
          actorId: item.actorId,
          actor: userMap.get(item.actorId) ?? null,
          payload: item.payload,
          createdAt: item.createdAt,
        }),
      ),
    };
  }

  private resolveOvertimeEffortOwnerIds(
    dto: CreateOvertimeRequestRequest,
    requesterId: string,
  ): string[] {
    const candidateIds =
      dto.effortOwnerIds && dto.effortOwnerIds.length > 0
        ? dto.effortOwnerIds
        : dto.effortOwnerId
          ? [dto.effortOwnerId]
          : [requesterId];

    const uniqueIds = [...new Set(candidateIds.filter(Boolean))];
    const requesterIndex = uniqueIds.indexOf(requesterId);

    if (requesterIndex <= 0) {
      return uniqueIds;
    }

    return [
      requesterId,
      ...uniqueIds.filter((userId) => userId !== requesterId),
    ];
  }
}
