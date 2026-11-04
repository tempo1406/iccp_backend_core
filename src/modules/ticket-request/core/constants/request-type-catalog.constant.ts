import {
  TicketRequestType,
  TicketRequestWorkflowCode,
} from '../entities/ticket-request.entity';

export interface TicketRequestDisplayTypeOption {
  code: string;
  label: string;
  type: TicketRequestType;
  allowedWorkflowCodes: TicketRequestWorkflowCode[];
  defaultWorkflowCode: TicketRequestWorkflowCode;
  isCustom?: boolean;
}

export interface TicketRequestReasonOption {
  code: string;
  label: string;
}

export const TICKET_REQUEST_DISPLAY_TYPE_OPTIONS: TicketRequestDisplayTypeOption[] =
  [
    {
      code: 'work_from_home',
      label: 'Work from home',
      type: TicketRequestType.WFH,
      allowedWorkflowCodes: [TicketRequestWorkflowCode.WORKING_TIME, TicketRequestWorkflowCode.WORKING_TIME_DIRECT],
      defaultWorkflowCode: TicketRequestWorkflowCode.WORKING_TIME,
    },
    {
      code: 'late_coming',
      label: 'Late coming',
      type: TicketRequestType.GENERAL,
      allowedWorkflowCodes: [TicketRequestWorkflowCode.WORKING_TIME, TicketRequestWorkflowCode.WORKING_TIME_DIRECT],
      defaultWorkflowCode: TicketRequestWorkflowCode.WORKING_TIME,
    },
    {
      code: 'early_leave',
      label: 'Early leave',
      type: TicketRequestType.GENERAL,
      allowedWorkflowCodes: [TicketRequestWorkflowCode.WORKING_TIME, TicketRequestWorkflowCode.WORKING_TIME_DIRECT],
      defaultWorkflowCode: TicketRequestWorkflowCode.WORKING_TIME,
    },
    {
      code: 'paid_leave',
      label: 'Paid leave',
      type: TicketRequestType.LEAVE,
      allowedWorkflowCodes: [TicketRequestWorkflowCode.WORKING_TIME, TicketRequestWorkflowCode.WORKING_TIME_DIRECT],
      defaultWorkflowCode: TicketRequestWorkflowCode.WORKING_TIME,
    },
    {
      code: 'overtime_request',
      label: 'Overtime request',
      type: TicketRequestType.OVERTIME,
      allowedWorkflowCodes: [
        TicketRequestWorkflowCode.OVERTIME_STANDARD_DIRECT,
        TicketRequestWorkflowCode.OVERTIME_OPIC,
      ],
      defaultWorkflowCode: TicketRequestWorkflowCode.OVERTIME_STANDARD_DIRECT,
    },
    {
      code: 'others',
      label: 'Others',
      type: TicketRequestType.GENERAL,
      allowedWorkflowCodes: [TicketRequestWorkflowCode.WORKING_TIME, TicketRequestWorkflowCode.WORKING_TIME_DIRECT],
      defaultWorkflowCode: TicketRequestWorkflowCode.WORKING_TIME,
      isCustom: true,
    },
  ];

export const TICKET_REQUEST_REASON_OPTIONS: TicketRequestReasonOption[] = [
  { code: 'personal_reason', label: 'Personal reason' },
  { code: 'family_reason', label: 'Family reason' },
  { code: 'medical_reason', label: 'Medical reason' },
  { code: 'medical_treatment', label: 'Medical treatment' },
  { code: 'child_care', label: 'Child care' },
  { code: 'marriage_reason', label: 'Marriage / family event' },
  { code: 'funeral_reason', label: 'Funeral event' },
  { code: 'military_reason', label: 'Military obligation' },
  { code: 'maternity_paternity', label: 'Maternity / paternity' },
  { code: 'annual_leave', label: 'Annual leave' },
  { code: 'annual_leave_plan', label: 'Annual leave plan' },
  { code: 'unpaid_leave_reason', label: 'Unpaid leave reason' },
  { code: 'compensation_leave_reason', label: 'Compensation leave reason' },
  { code: 'project_deadline', label: 'Project deadline / workload peak' },
  { code: 'office_schedule_adjustment', label: 'Office schedule adjustment' },
  { code: 'policy_exception', label: 'Policy exception' },
  { code: 'ot_project_deadline', label: 'Project deadline / workload peak' },
  { code: 'ot_release_support', label: 'Release / deployment support' },
  { code: 'ot_incident_support', label: 'Incident / production support' },
  { code: 'ot_maintenance_migration', label: 'Maintenance / migration work' },
  { code: 'ot_client_commitment', label: 'Client commitment / urgent support' },
  { code: 'ot_cross_team_support', label: 'Cross-team dependency / support' },
  { code: 'ot_other', label: 'Others' },
  { code: 'other', label: 'Other' },
];

export const TICKET_REQUEST_DISPLAY_TYPE_MAP = new Map(
  TICKET_REQUEST_DISPLAY_TYPE_OPTIONS.map((item) => [item.code, item]),
);

export const TICKET_REQUEST_REASON_MAP = new Map(
  TICKET_REQUEST_REASON_OPTIONS.map((item) => [item.code, item]),
);
