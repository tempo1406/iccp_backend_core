import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OtMetadata,
  TicketRequest,
  TicketRequestStatus,
  TicketRequestType,
  TicketRequestWorkflowCode,
} from '../../entities/ticket-request.entity';
import { TicketRequestActivityAction } from '../../entities/ticket-request-activity.entity';

export interface TicketRequestUserRaw {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export class TicketRequestUserResponse {
  @ApiProperty({ example: '307f0059-51fa-43ea-b1dc-a9629ca1389f' })
  id: string;

  @ApiProperty({ example: 'user@iccp.ai' })
  email: string;

  @ApiPropertyOptional({ example: 'Nguyen' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'An' })
  lastName?: string;

  static fromRaw(raw?: TicketRequestUserRaw): TicketRequestUserResponse | null {
    if (!raw) return null;

    return {
      id: raw.id,
      email: raw.email,
      firstName: raw.firstName,
      lastName: raw.lastName,
    };
  }
}

export class TicketRequestDelegateOptionResponse extends TicketRequestUserResponse {
  @ApiProperty({ example: true })
  isOrgAdmin: boolean;

  @ApiProperty({ example: false })
  isDefault: boolean;
}

export class TicketRequestCcMemberResponse {
  @ApiProperty({ type: TicketRequestUserResponse })
  member: TicketRequestUserResponse;

  @ApiProperty({ example: '2026-03-13T09:30:00.000Z' })
  addedAt: Date;

  @ApiPropertyOptional({ type: TicketRequestUserResponse })
  addedBy: TicketRequestUserResponse | null;
}

export class TicketRequestActivityResponse {
  @ApiProperty({ example: '3f6f4f6d-1111-4f4c-aa0a-b1d86026f6d9' })
  id: string;

  @ApiProperty({ enum: TicketRequestActivityAction })
  action: TicketRequestActivityAction;

  @ApiPropertyOptional({ enum: TicketRequestStatus })
  fromStatus?: TicketRequestStatus;

  @ApiPropertyOptional({ enum: TicketRequestStatus })
  toStatus?: TicketRequestStatus;

  @ApiProperty({ example: '307f0059-51fa-43ea-b1dc-a9629ca1389f' })
  actorId: string;

  @ApiPropertyOptional({ type: TicketRequestUserResponse })
  actor?: TicketRequestUserResponse | null;

  @ApiPropertyOptional({
    example: { reason: 'Cap nhat noi dung theo yeu cau' },
  })
  payload?: Record<string, unknown>;

  @ApiProperty({ example: '2026-03-13T09:30:00.000Z' })
  createdAt: Date;
}

export class TicketRequestCommentResponse {
  @ApiProperty({ example: '3f6f4f6d-1111-4f4c-aa0a-b1d86026f6d9' })
  id: string;

  @ApiProperty({ example: 'Da cap nhat thong tin ban giao.' })
  content: string;

  @ApiProperty({ type: TicketRequestUserResponse })
  author: TicketRequestUserResponse;

  @ApiProperty({ example: '2026-03-13T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-13T09:30:00.000Z' })
  updatedAt: Date;
}

export class TicketRequestSummaryResponse {
  @ApiProperty({ example: '3f6f4f6d-1111-4f4c-aa0a-b1d86026f6d9' })
  id: string;

  @ApiProperty({ example: 'TR-20260313-930001' })
  code: string;

  @ApiProperty({ enum: TicketRequestType })
  type: TicketRequestType;

  @ApiProperty({ enum: TicketRequestWorkflowCode })
  workflowCode: TicketRequestWorkflowCode;

  @ApiProperty({ example: 'supervisor_confirm' })
  currentStepCode: string;

  @ApiProperty({ example: 1 })
  currentStepOrder: number;

  @ApiPropertyOptional({ example: 'paid_leave_last_year' })
  requestTypeCode?: string;

  @ApiPropertyOptional({ example: 'Paid leave of last year' })
  requestTypeName?: string;

  @ApiPropertyOptional({ example: 'annual_leave' })
  reasonCode?: string;

  @ApiProperty({ example: 'Xin nghi phep ngay thu 6' })
  title: string;

  @ApiProperty({ enum: TicketRequestStatus })
  status: TicketRequestStatus;

  @ApiProperty({ type: TicketRequestUserResponse })
  requester: TicketRequestUserResponse;

  @ApiPropertyOptional({ type: TicketRequestUserResponse })
  delegate?: TicketRequestUserResponse | null;

  @ApiPropertyOptional({ type: [TicketRequestUserResponse] })
  effortOwners?: TicketRequestUserResponse[];

  @ApiProperty({ example: '2026-03-13T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-13T09:30:00.000Z' })
  updatedAt: Date;

  static fromEntity(
    entity: TicketRequest,
    requester?: TicketRequestUserRaw,
    delegate?: TicketRequestUserRaw,
    effortOwners: TicketRequestUserRaw[] = [],
  ): TicketRequestSummaryResponse {
    return {
      id: entity.id,
      code: entity.code,
      type: entity.type,
      workflowCode: entity.workflowCode,
      currentStepCode: entity.currentStepCode,
      currentStepOrder: entity.currentStepOrder,
      requestTypeCode: entity.requestTypeCode,
      requestTypeName: entity.requestTypeName,
      reasonCode: entity.reasonCode,
      title: entity.title,
      status: entity.status,
      requester: TicketRequestUserResponse.fromRaw(requester)!,
      delegate: TicketRequestUserResponse.fromRaw(delegate) ?? null,
      effortOwners: effortOwners
        .map((item) => TicketRequestUserResponse.fromRaw(item))
        .filter((item): item is TicketRequestUserResponse => !!item),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class TicketRequestDetailResponse extends TicketRequestSummaryResponse {
  @ApiProperty({ example: 'Noi dung chi tiet cua yeu cau.' })
  content: string;

  @ApiPropertyOptional({ example: 'Enter detail reason ...' })
  reasonDetail?: string;

  @ApiPropertyOptional({ type: TicketRequestUserResponse })
  effortOwner?: TicketRequestUserResponse | null;

  @ApiPropertyOptional({ example: '2026-03-20T08:00:00.000Z' })
  startAt?: Date;

  @ApiPropertyOptional({ example: '2026-03-20T17:00:00.000Z' })
  endAt?: Date;

  @ApiPropertyOptional({ example: 'Da duoc duyet.' })
  decisionNote?: string;

  @ApiPropertyOptional({ example: '2026-03-14T02:00:00.000Z' })
  decidedAt?: Date;

  @ApiPropertyOptional({ example: '307f0059-51fa-43ea-b1dc-a9629ca1389f' })
  decidedBy?: string;

  @ApiPropertyOptional({ example: '2026-03-14T02:00:00.000Z' })
  canceledAt?: Date;

  @ApiPropertyOptional({ example: '307f0059-51fa-43ea-b1dc-a9629ca1389f' })
  canceledBy?: string;

  @ApiPropertyOptional({
    description: 'Dữ liệu OT-specific (chỉ có khi type = overtime).',
    example: {
      projectId: '307f0059-51fa-43ea-b1dc-a9629ca1389f',
      plannedHours: 4,
      affectedMemberIds: ['6fdf6ffc-ed77-94fa-407e-a7b86ed9e59d'],
      effortEntries: [
        { date: '2026-03-20', hours: 4, taskDescription: 'Implement OT flow' },
      ],
      totalActualHours: 4,
      effortDetail: 'Hoàn thành đúng scope.',
    },
  })
  otMetadata?: OtMetadata;

  @ApiProperty({ type: [TicketRequestCcMemberResponse] })
  ccMembers: TicketRequestCcMemberResponse[];

  @ApiProperty({ type: [TicketRequestActivityResponse] })
  activities: TicketRequestActivityResponse[];
}

export class TicketRequestDisplayTypeOptionResponse {
  @ApiProperty({ example: 'paid_leave_last_year' })
  code: string;

  @ApiProperty({ example: 'Paid leave of last year' })
  label: string;

  @ApiProperty({ enum: TicketRequestType })
  type: TicketRequestType;

  @ApiProperty({ enum: TicketRequestWorkflowCode, isArray: true })
  allowedWorkflowCodes: TicketRequestWorkflowCode[];

  @ApiProperty({ enum: TicketRequestWorkflowCode })
  defaultWorkflowCode: TicketRequestWorkflowCode;

  @ApiPropertyOptional({ example: false, description: 'FE hien thi text input de user tu nhap ten request type' })
  isCustom?: boolean;
}

export class TicketRequestReasonOptionResponse {
  @ApiProperty({ example: 'personal_reason' })
  code: string;

  @ApiProperty({ example: 'Personal reason' })
  label: string;
}
