export const INVITATION_EVENTS = {
  SENT: 'invitation.sent',
  CANCELLED: 'invitation.cancelled',
  RESENT: 'invitation.resent',
} as const;

export interface InvitationSentEvent {
  invitationId: string;
  email: string;
  orgId: string;
  orgName: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptUrl: string;
  message?: string | null;
}

export interface InvitationCancelledEvent {
  invitationId: string;
  email: string;
  orgId: string;
  orgName: string;
}

export type InvitationResentEvent = InvitationSentEvent;
