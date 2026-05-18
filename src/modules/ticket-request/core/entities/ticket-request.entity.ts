import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum TicketRequestType {
  LEAVE = 'leave',
  WFH = 'wfh',
  OVERTIME = 'overtime',
  ADVANCE = 'advance',
  GENERAL = 'general',
}

export enum TicketRequestWorkflowCode {
  WORKING_TIME = 'working_time',
  WORKING_TIME_DIRECT = 'working_time_direct',
  OVERTIME_OPIC = 'overtime_opic',
  OVERTIME_STANDARD_DIRECT = 'overtime_standard_direct',
}

export enum TicketRequestWorkflowStepCode {
  EMP_CREATE_REQUEST = 'emp_create_request',
  SUPERVISOR_CONFIRM = 'supervisor_confirm',
  ORG_APPROVE = 'org_approve',
  PM_CREATE_REQUEST = 'pm_create_request',
  ORG_CONFIRM = 'org_confirm',
  OPIC_APPROVE_PRE = 'opic_approve_pre',
  PROJECT_MEMBER_DECLARE_OT = 'project_member_declare_ot',
  PM_CONFIRM = 'pm_confirm',
  OPIC_APPROVE_POST = 'opic_approve_post',
  ORG_APPROVE_PRE = 'org_approve_pre',
  ORG_APPROVE_POST = 'org_approve_post',
  HR_BASELINE = 'hr_baseline',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELED = 'canceled',
}

export enum TicketRequestStatus {
  PENDING_APPROVAL = 'pending_approval',
  PENDING_SUBMISSION = 'pending_submission',
  CHANGES_REQUESTED = 'changes_requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELED = 'canceled',
}

export interface OtEffortEntry {
  date: string;
  hours: number;
  taskDescription: string;
  workDescription?: string;
}

export interface OtMetadata {
  // PM fills at creation (PM_CREATE_REQUEST step)
  projectId?: string;
  projectName?: string;
  plannedHours?: number;
  scope?: string;
  effortOwnerIds?: string[];
  groupEffortOwnerIds?: string[];
  splitGroupId?: string;
  splitFromMultiOwner?: boolean;
  // effortOwner fills at PROJECT_MEMBER_DECLARE_OT step
  effortEntries?: OtEffortEntry[];
  totalActualHours?: number;
  effortDetail?: string;
}

@Entity({ schema: 'tenant', name: 'ticket_requests' })
@Unique(['organizationId', 'code'])
export class TicketRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'code', type: 'varchar', length: 40 })
  code: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: TicketRequestType,
    enumName: 'ticket_request_type',
  })
  type: TicketRequestType;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'requester_id', type: 'uuid' })
  requesterId: string;

  @Column({ name: 'delegate_id', type: 'uuid' })
  delegateId: string;

  @Column({
    name: 'workflow_code',
    type: 'enum',
    enum: TicketRequestWorkflowCode,
    enumName: 'ticket_request_workflow_code',
    default: TicketRequestWorkflowCode.WORKING_TIME,
  })
  workflowCode: TicketRequestWorkflowCode;

  @Column({
    name: 'current_step_code',
    type: 'varchar',
    length: 80,
    default: TicketRequestWorkflowStepCode.SUPERVISOR_CONFIRM,
  })
  currentStepCode: string;

  @Column({ name: 'current_step_order', type: 'int', default: 1 })
  currentStepOrder: number;

  @Column({ name: 'effort_owner_id', type: 'uuid', nullable: true })
  effortOwnerId?: string;

  @Column({
    name: 'request_type_code',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  requestTypeCode?: string;

  @Column({
    name: 'request_type_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  requestTypeName?: string;

  @Column({ name: 'reason_code', type: 'varchar', length: 255, nullable: true })
  reasonCode?: string;

  @Column({ name: 'reason_detail', type: 'text', nullable: true })
  reasonDetail?: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: TicketRequestStatus,
    enumName: 'ticket_request_status',
    default: TicketRequestStatus.PENDING_APPROVAL,
  })
  status: TicketRequestStatus;

  @Column({ name: 'start_at', type: 'timestamp', nullable: true })
  startAt?: Date;

  @Column({ name: 'end_at', type: 'timestamp', nullable: true })
  endAt?: Date;

  @Column({ name: 'decision_note', type: 'text', nullable: true })
  decisionNote?: string;

  @Column({ name: 'decided_at', type: 'timestamp', nullable: true })
  decidedAt?: Date;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy?: string;

  @Column({ name: 'canceled_at', type: 'timestamp', nullable: true })
  canceledAt?: Date;

  @Column({ name: 'canceled_by', type: 'uuid', nullable: true })
  canceledBy?: string;

  @Column({ name: 'ot_metadata', type: 'jsonb', nullable: true })
  otMetadata?: OtMetadata;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
