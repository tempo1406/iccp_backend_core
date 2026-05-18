import { ForbiddenException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { TicketRequestWorkflowService } from './workflow.service';
import {
  TicketRequest,
  TicketRequestStatus,
  TicketRequestType,
  TicketRequestWorkflowCode,
  TicketRequestWorkflowStepCode,
} from '../core/entities/ticket-request.entity';
import { TicketRequestActivity } from '../core/entities/ticket-request-activity.entity';
import { TicketRequestCcMember } from '../core/entities/ticket-request-cc-member.entity';
import { TicketRequestCoreService } from '../core/core.service';

describe('TicketRequestWorkflowService', () => {
  let service: TicketRequestWorkflowService;
  let ticketRepo: Record<string, never>;
  let activityRepo: Record<string, never>;
  let ccMemberRepo: Record<string, never>;
  let dataSource: { transaction: jest.Mock };
  let manager: {
    getRepository: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let updateRepo: { save: jest.Mock };
  let coreService: {
    getTicketOrThrow: jest.Mock;
    ensureMembersExist: jest.Mock;
    ensureUserCanBeDelegate: jest.Mock;
    getOrganizationAdminMemberIds: jest.Mock;
    getEligibleDelegateIds: jest.Mock;
    getTicketCcMemberIds: jest.Mock;
    notifyUsers: jest.Mock;
    getTicketDetail: jest.Mock;
  };
  const ORG_ID = 'org-1';
  const REQUESTER_ID = 'user-requester';
  const SUPERVISOR_ID = 'user-supervisor';
  const ORG_ADMIN_ID = 'user-org-admin';

  beforeEach(() => {
    ticketRepo = {};
    activityRepo = {};
    ccMemberRepo = {};
    updateRepo = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    manager = {
      getRepository: jest.fn().mockReturnValue(updateRepo),
      save: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_: unknown, payload: unknown) => payload),
    };
    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    coreService = {
      getTicketOrThrow: jest.fn(),
      ensureMembersExist: jest.fn().mockResolvedValue(undefined),
      ensureUserCanBeDelegate: jest.fn().mockResolvedValue(undefined),
      getOrganizationAdminMemberIds: jest.fn().mockResolvedValue([ORG_ADMIN_ID]),
      getEligibleDelegateIds: jest.fn().mockResolvedValue([
        SUPERVISOR_ID,
        ORG_ADMIN_ID,
      ]),
      getTicketCcMemberIds: jest.fn().mockResolvedValue([]),
      notifyUsers: jest.fn(),
      getTicketDetail: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
    };
    service = new TicketRequestWorkflowService(
      ticketRepo as unknown as Repository<TicketRequest>,
      activityRepo as unknown as Repository<TicketRequestActivity>,
      ccMemberRepo as unknown as Repository<TicketRequestCcMember>,
      dataSource as unknown as DataSource,
      coreService as unknown as TicketRequestCoreService,
    );
  });

  it('auto assigns a concrete org admin when approving into ORG_APPROVE', async () => {
    const ticket = makeTicket({
      requesterId: REQUESTER_ID,
      delegateId: SUPERVISOR_ID,
      workflowCode: TicketRequestWorkflowCode.WORKING_TIME,
      currentStepCode: TicketRequestWorkflowStepCode.SUPERVISOR_CONFIRM,
      currentStepOrder: 1,
    });
    coreService.getTicketOrThrow.mockResolvedValue(ticket);

    await service.approveTicket(ticket.id, ORG_ID, SUPERVISOR_ID, {});

    expect(ticket.currentStepCode).toBe(TicketRequestWorkflowStepCode.ORG_APPROVE);
    expect(ticket.currentStepOrder).toBe(2);
    expect(ticket.delegateId).toBe(ORG_ADMIN_ID);
    expect(coreService.getOrganizationAdminMemberIds).toHaveBeenCalledWith(
      ORG_ID,
    );
    expect(coreService.getEligibleDelegateIds).toHaveBeenCalledWith(ORG_ID);
  });

  it('rejects processing when actor is not the assigned delegate', async () => {
    const ticket = makeTicket({
      requesterId: REQUESTER_ID,
      delegateId: SUPERVISOR_ID,
      workflowCode: TicketRequestWorkflowCode.WORKING_TIME,
      currentStepCode: TicketRequestWorkflowStepCode.SUPERVISOR_CONFIRM,
      currentStepOrder: 1,
    });
    coreService.getTicketOrThrow.mockResolvedValue(ticket);

    await expect(
      service.approveTicket(ticket.id, ORG_ID, ORG_ADMIN_ID, {}),
    ).rejects.toThrow(
      new ForbiddenException('Only assigned delegate can process this ticket'),
    );
  });

  it('stages requester as next assignee when moving to PROJECT_MEMBER_DECLARE_OT', async () => {
    const ticket = makeTicket({
      requesterId: REQUESTER_ID,
      delegateId: ORG_ADMIN_ID,
      workflowCode: TicketRequestWorkflowCode.OVERTIME_STANDARD_DIRECT,
      currentStepCode: TicketRequestWorkflowStepCode.ORG_APPROVE_PRE,
      currentStepOrder: 1,
      type: TicketRequestType.OVERTIME,
    });
    coreService.getTicketOrThrow.mockResolvedValue(ticket);

    await service.approveTicket(ticket.id, ORG_ID, ORG_ADMIN_ID, {});

    expect(ticket.currentStepCode).toBe(
      TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
    );
    expect(ticket.status).toBe(TicketRequestStatus.PENDING_SUBMISSION);
    expect(ticket.delegateId).toBe(REQUESTER_ID);
  });

  it('skips PM_CONFIRM after OT declaration when requester declares their own OT', async () => {
    const ticket = makeTicket({
      requesterId: REQUESTER_ID,
      delegateId: REQUESTER_ID,
      workflowCode: TicketRequestWorkflowCode.OVERTIME_STANDARD_DIRECT,
      currentStepCode: TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
      currentStepOrder: 2,
      type: TicketRequestType.OVERTIME,
      status: TicketRequestStatus.PENDING_SUBMISSION,
      effortOwnerId: REQUESTER_ID,
      otMetadata: {
        projectId: 'project-1',
        effortOwnerIds: [REQUESTER_ID],
      },
      startAt: new Date('2026-04-19T00:00:00.000Z'),
      endAt: new Date('2026-04-21T00:00:00.000Z'),
    });
    coreService.getTicketOrThrow.mockResolvedValue(ticket);

    await service.declareOtEffort(ticket.id, ORG_ID, REQUESTER_ID, {
      effortEntries: [
        {
          date: '2026-04-20',
          hours: 4,
          taskDescription: 'Declared effort',
        },
      ],
      totalActualHours: 4,
    });

    expect(ticket.currentStepCode).toBe(
      TicketRequestWorkflowStepCode.ORG_APPROVE_POST,
    );
    expect(ticket.delegateId).toBe(ORG_ADMIN_ID);
  });

  it('keeps PM_CONFIRM after OT declaration when effort owner differs from requester', async () => {
    const effortOwnerId = 'user-effort-owner';
    const ticket = makeTicket({
      requesterId: REQUESTER_ID,
      delegateId: REQUESTER_ID,
      workflowCode: TicketRequestWorkflowCode.OVERTIME_STANDARD_DIRECT,
      currentStepCode: TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
      currentStepOrder: 2,
      type: TicketRequestType.OVERTIME,
      status: TicketRequestStatus.PENDING_SUBMISSION,
      effortOwnerId,
      otMetadata: {
        projectId: 'project-1',
        effortOwnerIds: [effortOwnerId],
      },
      startAt: new Date('2026-04-19T00:00:00.000Z'),
      endAt: new Date('2026-04-21T00:00:00.000Z'),
    });
    coreService.getTicketOrThrow.mockResolvedValue(ticket);

    await service.declareOtEffort(ticket.id, ORG_ID, effortOwnerId, {
      effortEntries: [
        {
          date: '2026-04-20',
          hours: 4,
          taskDescription: 'Declared effort',
        },
      ],
      totalActualHours: 4,
    });

    expect(ticket.currentStepCode).toBe(
      TicketRequestWorkflowStepCode.PM_CONFIRM,
    );
    expect(ticket.delegateId).toBe(REQUESTER_ID);
  });

  it('keeps PM_CONFIRM when requester creates OT for another employee', async () => {
    const effortOwnerId = 'user-effort-owner';
    const ticket = makeTicket({
      requesterId: REQUESTER_ID,
      delegateId: REQUESTER_ID,
      workflowCode: TicketRequestWorkflowCode.OVERTIME_STANDARD_DIRECT,
      currentStepCode: TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
      currentStepOrder: 2,
      type: TicketRequestType.OVERTIME,
      status: TicketRequestStatus.PENDING_SUBMISSION,
      effortOwnerId,
      otMetadata: {
        projectId: 'project-1',
        effortOwnerIds: [effortOwnerId],
      },
      startAt: new Date('2026-04-19T00:00:00.000Z'),
      endAt: new Date('2026-04-21T00:00:00.000Z'),
    });
    coreService.getTicketOrThrow.mockResolvedValue(ticket);

    await service.declareOtEffort(ticket.id, ORG_ID, effortOwnerId, {
      effortEntries: [
        {
          date: '2026-04-20',
          hours: 4,
          taskDescription: 'Declared effort',
        },
      ],
      totalActualHours: 4,
    });

    expect(ticket.currentStepCode).toBe(
      TicketRequestWorkflowStepCode.PM_CONFIRM,
    );
    expect(ticket.delegateId).toBe(REQUESTER_ID);
  });
});

function makeTicket(overrides: Partial<TicketRequest> = {}): TicketRequest {
  return {
    id: 'ticket-1',
    organizationId: 'org-1',
    code: 'TR-20260409-000001',
    type: TicketRequestType.LEAVE,
    title: 'Ticket title',
    content: 'Ticket content',
    requesterId: 'user-requester',
    delegateId: 'user-supervisor',
    workflowCode: TicketRequestWorkflowCode.WORKING_TIME,
    currentStepCode: TicketRequestWorkflowStepCode.SUPERVISOR_CONFIRM,
    currentStepOrder: 1,
    effortOwnerId: 'user-requester',
    requestTypeCode: 'paid_leave',
    requestTypeName: 'Paid leave',
    reasonCode: 'annual_leave',
    reasonDetail: 'Reason detail',
    status: TicketRequestStatus.PENDING_APPROVAL,
    startAt: undefined,
    endAt: undefined,
    decisionNote: undefined,
    decidedAt: undefined,
    decidedBy: undefined,
    canceledAt: undefined,
    canceledBy: undefined,
    otMetadata: undefined,
    createdAt: new Date('2026-04-09T00:00:00.000Z'),
    updatedAt: new Date('2026-04-09T00:00:00.000Z'),
    deletedAt: undefined,
    ...overrides,
  };
}
