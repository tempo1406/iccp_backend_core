export type TicketRequestWsAction =
  | 'created'
  | 'submitted'
  | 'updated'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'canceled'
  | 'commented'
  | 'cc_added'
  | 'cc_removed';

export type TicketRequestWsStatus =
  | 'pending_approval'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'canceled';

export interface TicketRequestUpdatedWsPayload {
  ticketId: string;
  code: string;
  organizationId: string;
  action: TicketRequestWsAction;
  actorId: string;
  status: TicketRequestWsStatus;
  currentStepCode: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  occurredAt: string;
}
