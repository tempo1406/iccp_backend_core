import { ConflictException } from '@nestjs/common';

import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';

import {
  TicketRequest,
  TicketRequestType,
  TicketRequestWorkflowCode,
  TicketRequestWorkflowStepCode,
} from './core/entities/ticket-request.entity';
import { TicketRequestActivityAction } from './core/entities/ticket-request-activity.entity';

// ─── Types & Interfaces ───────────────────────────────────────────────────────

export type WorkflowStepActionType = 'submit' | 'approve';
export type WorkflowRejectMode = 'terminal' | 'send_back';

export interface WorkflowStepDefinition {
  code: TicketRequestWorkflowStepCode;
  order: number;
  actionType: WorkflowStepActionType;
  nextStepOnApprove?: TicketRequestWorkflowStepCode;
  rejectMode?: WorkflowRejectMode;
  rejectToStep?: TicketRequestWorkflowStepCode;
}

export interface WorkflowDefinition {
  code: TicketRequestWorkflowCode;
  createStepCode: TicketRequestWorkflowStepCode;
  steps: WorkflowStepDefinition[];
}

export interface TicketRequestNotificationContext {
  ticket: TicketRequest;
  actorId: string;
  action: TicketRequestActivityAction;
  data?: Record<string, unknown>;
}

// ─── Workflow Definitions ─────────────────────────────────────────────────────

export const WORKFLOW_DEFINITIONS: Record<
  TicketRequestWorkflowCode,
  WorkflowDefinition
> = {
  [TicketRequestWorkflowCode.WORKING_TIME]: {
    code: TicketRequestWorkflowCode.WORKING_TIME,
    createStepCode: TicketRequestWorkflowStepCode.EMP_CREATE_REQUEST,
    steps: [
      {
        code: TicketRequestWorkflowStepCode.EMP_CREATE_REQUEST,
        order: 0,
        actionType: 'submit',
        nextStepOnApprove: TicketRequestWorkflowStepCode.SUPERVISOR_CONFIRM,
      },
      {
        code: TicketRequestWorkflowStepCode.SUPERVISOR_CONFIRM,
        order: 1,
        actionType: 'approve',
        nextStepOnApprove: TicketRequestWorkflowStepCode.ORG_APPROVE,
        rejectMode: 'terminal',
      },
      {
        code: TicketRequestWorkflowStepCode.ORG_APPROVE,
        order: 2,
        actionType: 'approve',
        rejectMode: 'terminal',
      },
    ],
  },
  [TicketRequestWorkflowCode.WORKING_TIME_DIRECT]: {
    code: TicketRequestWorkflowCode.WORKING_TIME_DIRECT,
    createStepCode: TicketRequestWorkflowStepCode.EMP_CREATE_REQUEST,
    steps: [
      {
        code: TicketRequestWorkflowStepCode.EMP_CREATE_REQUEST,
        order: 0,
        actionType: 'submit',
        nextStepOnApprove: TicketRequestWorkflowStepCode.ORG_APPROVE,
      },
      {
        code: TicketRequestWorkflowStepCode.ORG_APPROVE,
        order: 1,
        actionType: 'approve',
        rejectMode: 'terminal',
      },
    ],
  },
  [TicketRequestWorkflowCode.OVERTIME_OPIC]: {
    code: TicketRequestWorkflowCode.OVERTIME_OPIC,
    createStepCode: TicketRequestWorkflowStepCode.PM_CREATE_REQUEST,
    steps: [
      {
        code: TicketRequestWorkflowStepCode.PM_CREATE_REQUEST,
        order: 0,
        actionType: 'submit',
        nextStepOnApprove: TicketRequestWorkflowStepCode.ORG_CONFIRM,
      },
      {
        code: TicketRequestWorkflowStepCode.ORG_CONFIRM,
        order: 1,
        actionType: 'approve',
        nextStepOnApprove: TicketRequestWorkflowStepCode.OPIC_APPROVE_PRE,
        rejectMode: 'send_back',
        rejectToStep: TicketRequestWorkflowStepCode.PM_CREATE_REQUEST,
      },
      {
        code: TicketRequestWorkflowStepCode.OPIC_APPROVE_PRE,
        order: 2,
        actionType: 'approve',
        nextStepOnApprove:
          TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
        rejectMode: 'send_back',
        rejectToStep: TicketRequestWorkflowStepCode.PM_CREATE_REQUEST,
      },
      {
        code: TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
        order: 3,
        actionType: 'submit',
        nextStepOnApprove: TicketRequestWorkflowStepCode.PM_CONFIRM,
      },
      {
        code: TicketRequestWorkflowStepCode.PM_CONFIRM,
        order: 4,
        actionType: 'approve',
        nextStepOnApprove: TicketRequestWorkflowStepCode.OPIC_APPROVE_POST,
        rejectMode: 'send_back',
        rejectToStep: TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
      },
      {
        code: TicketRequestWorkflowStepCode.OPIC_APPROVE_POST,
        order: 5,
        actionType: 'approve',
        nextStepOnApprove: TicketRequestWorkflowStepCode.HR_BASELINE,
        rejectMode: 'send_back',
        rejectToStep: TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
      },
      {
        code: TicketRequestWorkflowStepCode.HR_BASELINE,
        order: 6,
        actionType: 'approve',
        rejectMode: 'send_back',
        rejectToStep: TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
      },
    ],
  },
  [TicketRequestWorkflowCode.OVERTIME_STANDARD_DIRECT]: {
    code: TicketRequestWorkflowCode.OVERTIME_STANDARD_DIRECT,
    createStepCode: TicketRequestWorkflowStepCode.PM_CREATE_REQUEST,
    steps: [
      {
        code: TicketRequestWorkflowStepCode.PM_CREATE_REQUEST,
        order: 0,
        actionType: 'submit',
        nextStepOnApprove: TicketRequestWorkflowStepCode.ORG_APPROVE_PRE,
      },
      {
        code: TicketRequestWorkflowStepCode.ORG_APPROVE_PRE,
        order: 1,
        actionType: 'approve',
        nextStepOnApprove:
          TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
        rejectMode: 'send_back',
        rejectToStep: TicketRequestWorkflowStepCode.PM_CREATE_REQUEST,
      },
      {
        code: TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
        order: 2,
        actionType: 'submit',
        nextStepOnApprove: TicketRequestWorkflowStepCode.PM_CONFIRM,
      },
      {
        code: TicketRequestWorkflowStepCode.PM_CONFIRM,
        order: 3,
        actionType: 'approve',
        nextStepOnApprove: TicketRequestWorkflowStepCode.ORG_APPROVE_POST,
        rejectMode: 'send_back',
        rejectToStep: TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
      },
      {
        code: TicketRequestWorkflowStepCode.ORG_APPROVE_POST,
        order: 4,
        actionType: 'approve',
        rejectMode: 'send_back',
        rejectToStep: TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT,
      },
    ],
  },
};

// ─── Pure Helper Functions ────────────────────────────────────────────────────

export function resolveWorkflowCode(
  workflowCode: TicketRequestWorkflowCode | undefined,
  type: TicketRequestType,
): TicketRequestWorkflowCode {
  if (workflowCode) return workflowCode;
  if (type === TicketRequestType.OVERTIME) {
    return TicketRequestWorkflowCode.OVERTIME_STANDARD_DIRECT;
  }
  return TicketRequestWorkflowCode.WORKING_TIME;
}

export function getWorkflowDefinition(
  workflowCode: TicketRequestWorkflowCode,
): WorkflowDefinition {
  const workflow = WORKFLOW_DEFINITIONS[workflowCode];
  if (!workflow) {
    throw new ValidationException(ErrorCode.V000, 'Workflow is not supported');
  }
  return workflow;
}

export function getWorkflowStep(
  workflowCode: TicketRequestWorkflowCode,
  stepCode: TicketRequestWorkflowStepCode,
): WorkflowStepDefinition {
  const workflow = getWorkflowDefinition(workflowCode);
  const step = workflow.steps.find((item) => item.code === stepCode);
  if (!step) {
    throw new ValidationException(
      ErrorCode.V000,
      `Workflow step ${stepCode} is not configured`,
    );
  }
  return step;
}

export function getOptionalNextStep(
  workflowCode: TicketRequestWorkflowCode,
  step: WorkflowStepDefinition,
): WorkflowStepDefinition | null {
  if (!step.nextStepOnApprove) return null;
  return getWorkflowStep(workflowCode, step.nextStepOnApprove);
}

export function getNextStepOrThrow(
  workflowCode: TicketRequestWorkflowCode,
  step: WorkflowStepDefinition,
): WorkflowStepDefinition {
  const nextStep = getOptionalNextStep(workflowCode, step);
  if (!nextStep) {
    throw new ConflictException('Workflow step is missing next transition');
  }
  return nextStep;
}

export function getCurrentStep(ticket: TicketRequest): WorkflowStepDefinition {
  const workflowCode =
    ticket.workflowCode ?? resolveWorkflowCode(undefined, ticket.type);
  const currentStepCode =
    (ticket.currentStepCode as TicketRequestWorkflowStepCode) ||
    getWorkflowDefinition(workflowCode).createStepCode;
  return getWorkflowStep(workflowCode, currentStepCode);
}

export function getSubmitterIdForStep(
  ticket: TicketRequest,
  stepCode: TicketRequestWorkflowStepCode,
): string {
  return getSubmitterIdsForStep(ticket, stepCode)[0];
}

export function getSubmitterIdsForStep(
  ticket: TicketRequest,
  stepCode: TicketRequestWorkflowStepCode,
): string[] {
  if (
    stepCode === TicketRequestWorkflowStepCode.EMP_CREATE_REQUEST ||
    stepCode === TicketRequestWorkflowStepCode.PM_CREATE_REQUEST
  ) {
    return [ticket.requesterId];
  }
  if (stepCode === TicketRequestWorkflowStepCode.PROJECT_MEMBER_DECLARE_OT) {
    const effortOwnerIds = [
      ...(Array.isArray(ticket.otMetadata?.effortOwnerIds)
        ? ticket.otMetadata.effortOwnerIds
        : []),
      ...(ticket.effortOwnerId ? [ticket.effortOwnerId] : []),
    ].filter(Boolean);

    return [...new Set(effortOwnerIds)].length > 0
      ? [...new Set(effortOwnerIds)]
      : [ticket.requesterId];
  }
  throw new ConflictException(
    `Step ${stepCode} is not a submit step in current workflow`,
  );
}
